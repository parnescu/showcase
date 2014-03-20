config = { 
	port: process.env.PORT || 3001
	,dev: process.env.NODE_ENV = process.env.NODE_ENV || "development"
	,mongo: {
		dev: {
			host: "localhost",
			port: null,
			db: "showcase"
		},
		production: {
			host: "parnescu:adrian@dbh42.mongolab.com",
			port: 27427,
			db: "showcase"
		}
	}
}
express = require('express'); 

var app = express(),
	cfg = require('./config.js')(app, config),
	routes = require('./routes')();


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


app.listen(config.port);
console.log("SERVER:: started - mode: "+config.dev);