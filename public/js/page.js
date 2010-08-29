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
    }


    $(document).bind('keydown', 'up', function() { return false; });
    $(document).bind('keydown', 'down', function() { return false; });
    $(document).bind('keydown', 'left', function() { return false; });
    $(document).bind('keydown', 'right', function() { return false; });
    $(document).bind('keydown', 'space', function() { return false; });

})(jQuery);