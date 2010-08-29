function displayNotice(text) {
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
