module.exports = function(app, cfg){
	var path = require('path');

	app.configure(function(){
		app.set('view engine', "jade");
		app.set('views', path.join(__dirname, "views"))

		if (cfg.dev){
			app.use(express.favicon());
			app.use(express.logger('dev'));	
		}
		app.use(express.bodyParser());
		app.use(express.static(path.join(__dirname,'../public')));
		app.use(express.static(path.join(__dirname,'../bower_components')));
	});
}
