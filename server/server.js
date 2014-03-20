express = require('express'); 
config = require('./connect.js')();

var app = express(),
	routes = require('./routes')();

// init express middleware
require('./config.js')(app, config);


// setup paths
	app.get('/api/users', routes.getUsers);
	app.get('/api/users/:id', routes.getUsers);

	app.post('/api/fileUpload', routes.upload);
	app.post('/api/fileRemove', routes.remove);
	app.post('/api/:type', routes.addItem)
	app.put('/api/:type/:id', routes.updateItem)
	app.delete('/api/:type/:id', routes.removeItem);

	app.get('/api/*', routes.nowhere);
	app.get('/admin/partials/:id', routes.adminPartial);
	app.get('/admin', routes.admin);
	app.get('/admin/:id', routes.admin);

	app.get('/', routes.index);
	app.get('/test', function(req,res){ res.render('test')});
	app.get('*', routes.nowhere)
// end - setup paths


app.listen(config.port);
console.log("SERVER:: started - mode: "+config.dev);