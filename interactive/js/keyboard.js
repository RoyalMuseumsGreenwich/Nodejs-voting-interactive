var keyboard = {
	charKey: '_&#*',
	normalKey: 'abc123',
	shiftKeyUp: '&#8657; Aa ',
	shiftKeyDown: '&#8659; Aa ',
	//	Loosely checks that emails are provided in the format: anystring@anystring.anystring
	emailRegex: /[^\s@]+@[^\s@]+\.[^\s@]+/,
	alphaRegex: /^([A-Za-z])$/,
	// shiftKey: '&#x2B06;Aa',
	keys: 
	[
		["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "bksp"],
		["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", ".", "@"],
		["a", "s", "d", "f", "g", "h", "j", "k", "l", ".com", ".co.uk"],
		["z", "x", "c", "v", "b", "n", "m", "shiftKey", "charKey"]
	],
	charKeys: 
	[
		["!", "?", "#", "$", "%", "&", "*", "+", "-", "_", "bksp"],
		["=", "^", ":", ";", "'", "`", "/", "\\", "~", '"', ","],
		["(", ")", "{", "}", "<", ">", "[", "]", "|", "normalKey"]
	],

	addKeys: function(charKeys) {
		let that = this;
		// console.log(charKeys);
		var keyArray = charKeys ? this.charKeys : this.keys;
		// console.log(keyArray);
		keyArray.forEach(function(row, index) {
			let newRow = '<div class="row"></div';
			$(newRow).appendTo('.keyboard');
			row.forEach(function(key, index) {
				// console.log("Adding " + key);
				let newKey;
				//	Check whether key is a letter
				if(that.alphaRegex.test(key)) {
					newKey = '<div class="key alpha"><span>' + key + '</span></div';
				//	Otherwise, if it's any other single character
				} else if(key.length === 1) {
					newKey = '<div class="key"><span>' + key + '</span></div';
				//	Then look at 'special' keys
				} else if(key === 'bksp') {
					newKey = '<div class="key wide bksp"><span>' + key + '</span></div';
				} else if(key === '.com') {
					newKey = '<div class="key wide com"><span>' + key + '</span></div';
				} else if(key === '.co.uk') {
					newKey = '<div class="key wide couk"><span>' + key + '</span></div';
				} else if(key === 'shiftKey') {
					newKey = '<div class="key wide shift"><span>' + that.shiftKeyUp + '</span></div';
				} else if(key === 'charKey') {
					newKey = '<div class="key wide"><span>' + that.charKey + '</span></div';
				} else if(key === 'normalKey') {
					newKey = '<div class="key wide"><span>' + that.normalKey + '</span></div';
				}
				$(newKey).attr('data-key', key);
				$('.row').last().append(newKey);
			});
		});
		$('.key').click(function() {
			let inputString = $('#emailInput').val();
			let key = $(this).text();
			let input = document.getElementById('emailInput');
			//	input.selectionStart = position of caret in input field
			let pos = input.selectionStart;
			if(key === that.charKey) {
				keyboard.charToggle(true);
			} else if(key === that.normalKey) {
				keyboard.charToggle(false);
			} else if($(this).hasClass('shift')) {
				console.log("Shift");
				keyboard.changeCase();
			} else if(key === 'bksp') {
				//	If backspace is pressed, remove character prior to caret position if not at start of string
				if(pos > 0) {
					inputString = inputString.slice(0, pos - 1) + inputString.slice(pos, inputString.length)
					$('#emailInput').val(inputString);
					input.setSelectionRange(pos-1, pos-1);
				}
				input.focus();
			} else {
				if($(this).hasClass('uppercase')) {
					key = key.toUpperCase();
				}
				console.log(inputString.slice(0, pos));
				console.log(inputString.slice(pos, inputString.length));
				inputString = inputString.slice(0, pos) + key + inputString.slice(pos, inputString.length);
				$('#emailInput').val(inputString);
				input.focus();
				input.setSelectionRange(pos+1, pos+1);
			}
		});
		$('.keyboard').fadeIn('fast');
	},

	charToggle: function(charKeys) {
		let that = this;
		$('.keyboard').fadeOut('fast', function() {
			$('.row').remove();
			that.addKeys(charKeys)
		})
	},

	changeCase: function(revert) {
		let that = this;
		if(revert) {
			$('.alpha').removeClass('uppercase');
			$('.shift span').html(that.shiftKeyUp);
		} 
		$('.alpha span, .shift span').addClass('faded');
		$('.alpha span').first().one('transitionend', () => {
			if($('.alpha').hasClass('uppercase')) {
				$('.alpha').removeClass('uppercase');
				$('.shift span').html(that.shiftKeyUp);
			} else {
				$('.alpha').addClass('uppercase');
				$('.shift span').html(that.shiftKeyDown);
			}
			$('.alpha span, .shift span').removeClass('faded')
		});
	}
}
