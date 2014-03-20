module.exports = function(){
	return {
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
}