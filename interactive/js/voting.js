$(function() {

	//	DOM variables
	var $stillThereScreen = $('#stillThereScreen'),
			$attractScreen = $('#attractScreen'),
			$contentScreen = $('#contentScreen');

	//	XML
	var xmlPath_Content = "xml/content.xml";
	var $xmlDoc_Content;
	var xmlPath_Attractor = "xml/attractor.xml";
	var $xmlDoc_Attractor;

	//	Content
	var imageObjects = [];
	var categories = [];
	var displayedThumbs = [];
	var selectedImage;

	//	Timers & handlers
	var config = {
		imagePaths: {}
	};

	var stillThereTimeMax, stillThereTime, inactivityTimerMax;
	var stillThereHandler, inactivityHandler;
	var changingScreens;

	var voteConfirmedHandler;
	var voteConfirmedDisplayTime = 5000;

	var lockedControls;

	var fadeOutSpeed = 100;
	var fadeInSpeed = 100;

	//	Called on first load
	function firstLoad() {
		console.log("The application is loading...");
		setupMenu();
		loadXml(xmlPath_Content, $xmlDoc_Content);
		loadXml(xmlPath_Attractor, $xmlDoc_Attractor);

	}

	function setupMenu() {
		for(var i=0; i < 24; i++) {
			var thumbHolder = '<div class="thumbHolder"></div';
			$(thumbHolder).appendTo('#thumbs');
		}
	}



	//	XML & content loading
	//	Read xml file
	function loadXml(xmlPath, xmlDoc){
		// Load the xml file using ajax
		$.ajax({
			type: "GET",
			url: xmlPath,
			dataType: "xml",
			success: function(xml){
				console.log("XML data loaded from \"" + xmlPath + "\"");
				$xml = $(xml);
				switch($xml.find('xmlType').text()) {
					case 'Attractor': {
						processAttractorXml($xml);
						break;
					}
					case 'Content': {
						processContentXml($xml);
						break;
					}
					default: {
						break;
					}
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log(textStatus, errorThrown);
			}
		});
	}

	function processAttractorXml($xml){
		console.log("Processing Attractor screen XML...");
		$('.attractorHeadline').text($xml.find('attractorHeadline').text());
		$('.attractorBodyText').html($xml.find('attractorBodyText').html());
		$('.attractorVid source').attr('src', $xml.find('attractorVidPath').text());
		$('.attractorVid').each(function(index, attractorVid) {
			attractorVid.load();
			attractorVid.play();
		});
	}

	function processContentXml($xml){
		console.log("Processing Content XML...");

		inactivityTimerMax = parseInt($xml.find('inactivityTimerMax').text()) * 1000;
		stillThereTimeMax = parseInt($xml.find('stillThereTimeMax').text());

		config.imagePaths.ui = $xml.find('settings imagePaths ui').text();
		config.imagePaths.thumb = $xml.find('settings imagePaths thumb').text();
		config.imagePaths.large = $xml.find('settings imagePaths large').text();

		//	Load XML category data to categories
		$xml.find('categories category').each(function() {
			var $thisCategory = $(this);
			var thisCategoryObject = {
				id: parseInt($thisCategory.attr('id')),
				name: $thisCategory.find('name').text(),
				icon: config.imagePaths.ui + $thisCategory.find('icon').html()
			}
			categories.push(thisCategoryObject);
		});

		console.log(categories);

		//	Load XML image data to imageObjects
		$xml.find('images image').each(function(){
			//	Build up slide variable
			var $thisImage = $(this);
			var thisImageObject = {
				ref: $thisImage.attr('ref'),
				id: $thisImage.find('id').text(),
				category: parseInt($thisImage.find('category').html()),
				title: $thisImage.find('title').html(),
				photographer: $thisImage.find('photographer').html() === '' ? undefined : $thisImage.find('photographer').html(),
				prize: $thisImage.find('prize').html() === '' ? '' : $thisImage.find('prize').html(),
				nationality: $thisImage.find('nationality').html() === '' ? undefined : $thisImage.find('nationality').html(),
				age: $thisImage.find('age').html() === '' ? undefined : $thisImage.find('age').html()
			}
			imageObjects.push(thisImageObject);
		});
		console.log(imageObjects);
		preloadImages(function() {
			displayThumbs();
		});
	}

	function preloadImages(callback) {
		var thumbs = new Array();
		for(var i=0; i<imageObjects.length; i++) {
			thumbs[i] = new Image();
			var thumbPath = config.imagePaths.thumb + imageObjects[i].ref + '.png';
			thumbs[i].onload = function() {
				console.log("Preloaded image " + this.src)
			}
			thumbs[i].src = thumbPath;
		}
		var images = new Array();
		for(var i=0; i<imageObjects.length; i++) {
			images[i] = new Image();
			var thumbPath = config.imagePaths.large + imageObjects[i].ref + '.png';
			images[i].onload = function() {
				console.log("Preloaded image " + this.src)
			}
			images[i].src = thumbPath;
		}
		callback();
	}

	function revertPopup() {
		$('#popupDiv').removeClass('displayed');
		$('#popupDiv').one('transitionend', () => {
			$('.popupPageDiv').removeClass('displayed');
			$('#confirmChoiceDiv').addClass('displayed');
		});
		keyboard.charToggle(false);
		keyboard.changeCase(true);
		$('#thumbs').fadeIn('fast');
		$('#contentScreen > h1').fadeIn('fast');
		$('#confirmTextDiv').removeClass('hidden');
		$('#confirmEmailDiv').addClass('hidden');
		$('.keyInput').val('');
	}

	function displayThumbs() {
		selectedImage = undefined;
		lockedControls = true;
		displayedThumbs = imageObjects;
		var thumbHolders = $('.thumbHolder');
		thumbHolders.css({
			'background-image': 'none'
		});
		thumbHolders.removeClass('displayed');
		for(var i=0; i < displayedThumbs.length; i++) {
			var rand = Math.floor(Math.random() * (thumbHolders.length));
			var thumbPath = 'url("' + config.imagePaths.thumb + displayedThumbs[i].ref + '.png")';
			var css = {
				'background-image': thumbPath
			}
			$(thumbHolders[rand]).addClass('displayed');
			$(thumbHolders[rand]).css(css);
			$(thumbHolders[rand]).data('imgObj', displayedThumbs[i]);
			thumbHolders.splice(rand, 1);
		}
		$('.thumbHolder').click(function() {
			if($(this).hasClass('displayed')) {
				selectImage($(this).data('imgObj'));
			}
		});
		$('#thumbHolderDiv').imagesLoaded({background: '.displayed'}, function() {
			$('.thumbHolder').fadeIn(fadeInSpeed, function() {
				lockedControls = false;
			});
		});
		revertPopup();
	}

	$('.cancelChoiceBtn').click(function() {
		console.log("Closing popup...");
		selectedImage = undefined;
		revertPopup();
	});

	$('#voteConfirmationDiv').click(() => {
		clearTimeout(voteConfirmedHandler);
		showAttractScreen(() => {
			revertPopup()
		});
	});

	$('#voteAndSubBtn').click(function() {
		$('.popupPageDiv').removeClass('displayed');
		$('#confirmEmailDiv').addClass('displayed');
	});

	$('#voteNoSubBtn').click(function(e) {
		e.preventDefault();
		lockedControls = true;
		confirmVote(false);
	});

	$('#confirmEmailBtn').click(function(e) {
		e.preventDefault();
		if($('#emailErrorBubble').hasClass('shown')) {
			//
		} else {
			lockedControls = true;

			//	Handle emails
			let emailAddress = $('#emailInput').val();

			if(!emailAddress) {
				displayEmailError("1");
			} else if(!keyboard.emailRegex.test(emailAddress)) {
				displayEmailError("2");
			} else {
				//	Handle invalid emails
				console.log("Saving user email...");
				confirmVote(emailAddress)
			}
		}
	});

	function displayPrivacyNotice() {
		$('#privacyContent').get(0).scrollTop = 0;
		$('#privacyNotice').addClass('displayed');
	}

	function hidePrivacyNotice() {
		$('#privacyNotice').removeClass('displayed');
	}

	$('.privacyLink').click(() => {
		displayPrivacyNotice();
	});

	$('.closePrivacyNoticeBtn').click(() => {
		hidePrivacyNotice();
	})

	function displayEmailError(messageNo) {
		console.log("Email error " + messageNo);
		$('#emailErrorBubble').removeClass('message1 message2');
		switch(messageNo) {
			case '1':
				// $('#emailErrorBubble').text("You must enter a valid email address to subscribe to the Space Newsletter!");
				// $('#emailErrorBubble').addClass('message1');
				$('#emailErrorBubble').text("Please enter a valid email address");
				$('#emailErrorBubble').addClass('message2');
				break;
			case '2':
				$('#emailErrorBubble').text("Please enter a valid email address");
				$('#emailErrorBubble').addClass('message2');
				break;
			default:
				break;
		}
		$('#emailErrorBubble').one('transitionend', () => {
			$('body').one('click', () => {
				$('#emailErrorBubble').removeClass('shown');
				$('#emailInput').removeClass('error');
			});
		});
		$('#emailErrorBubble').addClass('shown');
		$('#emailInput').addClass('error');
		lockedControls = false;
	}


	$('#testBtn').click(() => {
		let vote = {
			id: 'TEST01',
			name: 'Test picture',
			emailProvided: 'Yes'
		}
		console.log("Submitting TEST vote");
		saveVote(vote);
	})

	function confirmVote(emailAddress) {
		let vote = {
			id: selectedImage.id,
			name: selectedImage.title,
			emailAddress: emailAddress ? emailAddress : undefined
		}
		console.log("Submitting vote for ", vote.name);
		saveVote(vote);
	}

	function saveVote(vote) {
		console.log("Sending AJAX POST for ", vote.name);
		$.ajax('/vote', {
			data: vote,
			type: 'post'
		}).done(res => {
			console.log("Vote submitted for ", vote.name);
			console.log(res);
			$('.popupPageDiv').removeClass('displayed');
			$('#voteConfirmationDiv').addClass('displayed');
			$('#voteConfirmationDiv').one('transitionend', () => {
				lockedControls = false;
			});
		}).fail(err => {
			console.log("Error!\n", err);
			$('.popupPageDiv').removeClass('displayed');
			$('#voteConfirmationDiv').addClass('displayed');
			$('#voteConfirmationDiv').one('transitionend', () => {
				lockedControls = false;
			});
		}).always(() => {
			voteConfirmedHandler = setTimeout(() => {
				clearInactivityTimer();
				stillThereTimeout();
			}, voteConfirmedDisplayTime);
		});
	}

	function selectImage(imageObj) {
		selectedImage = imageObj;
		console.log("Selecting: " + selectedImage.title.replace('<![CDATA[', '').replace(']]>', ''));
		$('#thumbs').fadeOut('fast');
		$('#contentScreen > h1').fadeOut('fast');
		$('#confirmTextDiv h2').html(selectedImage.title.replace('<![CDATA[', '').replace(']]>', ''));
		$('#confirmTextDiv h3').text(selectedImage.photographer.replace('<![CDATA[', '').replace(']]>', ''));
		$('.popupImgDiv img').attr('src', 'img/l/' + selectedImage.ref + '.png');
		$('#popupDiv').addClass('displayed');
	}

	function showMenu() {
		displayThumbs();
	}

	//	Timers
	//	Inactivity timer
	function startInactivityTimer() {
		console.log("Inactivity timer started...");
		inactivityHandler = setTimeout(function() {
			showStillThereScreen();
		}, inactivityTimerMax);
	}

	function clearInactivityTimer() {
		console.log("Clearing Inactivity timer...");
		clearTimeout(inactivityHandler);
		inactivityHandler = 0;
	}

	function restartInactivityTimer() {
		console.log("Restarting Inactivity timer...");
		clearInactivityTimer();
		startInactivityTimer();
	}

	//	Onscreen keyboard
	keyboard.addKeys(false);

	//	Still There timer
	function startStillThereTimer() {
		stillThereHandler = setInterval(function() {
			stillThereTime--;
			console.log(stillThereTime);
			$('#stillThereSpan').text(stillThereTime);
			$('#stillThereSpanS').text('s');
			if(stillThereTime <= 0) {
				stillThereTimeout();
			} else if(stillThereTime === 1) {
				$('#stillThereSpanS').text('');
			}
		}, 1000);
	}

	function clearStillThereTimer() {
		clearInterval(stillThereHandler);
		stillThereHandler = 0;
	}

	function stillThereTimeout() {
		clearStillThereTimer();
		$('input').val('');
		showAttractScreen(hideStillThereScreen);
	}

	function showAttractScreen(callback) {
		changingScreens = true;
		console.log("Showing Attract screen");
		clearInactivityTimer();
		$attractScreen.fadeIn('slow', function() {
			showMenu();
			clearInactivityTimer();
			if(callback && typeof(callback) === 'function') {
				callback();
			}
			changingScreens = false;
		});
	}

	function showStillThereScreen() {
		console.log("Showing Still There screen");
		stillThereTime = stillThereTimeMax;
		$('#stillThereSpan').text(stillThereTime);
		$stillThereScreen.fadeIn('fast', function() {
			startStillThereTimer();
		});
	}

	function hideStillThereScreen() {
		$stillThereScreen.fadeOut('fast');
	}

	function flushCss(element) {
		element.offsetWidth;
	}

	//	Event handlers
	$attractScreen.click(function() {
		if(!changingScreens) {
			changingScreens = true;
			showMenu();
			$attractScreen.fadeOut('slow', function() {
				restartInactivityTimer();
				changingScreens = false;
			});
		}
	});

	$stillThereScreen.click(function() {
		hideStillThereScreen();
		clearStillThereTimer();
		restartInactivityTimer();
	});
	$stillThereScreen.on('touchstart', function() {
		console.log("touch!");
		hideStillThereScreen();
		clearStillThereTimer();
		restartInactivityTimer();
	});

	$contentScreen.click(function() {
		console.log("Content click");
		restartInactivityTimer();
	});
	$contentScreen.on('touchstart', function() {
		console.log("touch!");
		restartInactivityTimer();
	});

	firstLoad();

});

