var displayNotice;

(function($, undefined) {

    displayNotice = function(text) {
        var div = $("<p />")
            .hide()
            .text(text)
            .addClass("sidebar-notice")
            .css({ "opacity": "0.0", "color": "#FFC0CB" })
            .prependTo($("#sidebar"))
            .slideDown()
            .animate({ "opacity": "1.0" }, "slow");

        setTimeout(function(){div.css({ "color": "#fff" });}, 1000);
    };

	 function setupPlaceholder(inputid) {
     if ($.browser.webkit) return false;
		 
     var target = $('#'+inputid);
     if (target.length==0) {
       target = $('input[type="text"], input[type="email"], input[type="search"]');
     }
		 
     target.each( function(i, el) {
										el = $(el);
										var ph = el.attr('placeholder');
										if (!ph) return true;
										
										el.addClass('placeholder');
										el.attr('value', ph);
										
										el.focus( function(e) {
																if( el.val()==ph ) {
																	el.removeClass('placeholder');
																	el.attr('value', '');
																}
															});
										
										el.blur( function(e) {
															 if( $.trim(el.val())=='' ) {
																 el.addClass('placeholder');
																 el.attr('value', ph);
															 }
														 });
									});
	 }

	 setupPlaceholder("username");

    $("#username");

    $(document).bind('keydown', 'up', function() { return false; });
    $(document).bind('keydown', 'down', function() { return false; });
    $(document).bind('keydown', 'left', function() { return false; });
    $(document).bind('keydown', 'right', function() { return false; });
    $(document).bind('keydown', 'space', function() { return false; });

})(jQuery);