module.exports = function(config){
	var trace = function(m){ console.log(m)},
		mongo = require('mongoose'),
		db = mongo.connection,
		q = require('q');
		ObjectId = mongo.Schema.Types.ObjectId,
		details = config.dev === 'dev' ? config.mongo.dev : config.mongo.production,
		connection = ["mongodb:/", details.host+(details.port ? ":"+details.port : ""),details.db].join('/')

	trace("MONGO:: try to connect to "+details.host);
	db.on('error', function(err){ trace("\tMONGO:: error on db: "+err.errmsg);})
	db.once('open', function(){ trace("MONGO:: connection success")})
	mongo.connect(connection);

	// db schemas
		var socialSchema = mongo.Schema({
			title: String,
			user: String,
			link: String,
			userId: ObjectId
		}),
		languageSchema = mongo.Schema({
			name: String,
			level: String,
			description: String,
			userId: ObjectId
		}),
		userSchema = mongo.Schema({
			name: String,
			surname: String,
			birth: Date,
			location: String,
			country: String,
			avatar: String,
			description: String,

			homepage: String,
			background: String,
			social: [socialSchema],
			skill: [skillSchema],
			school: [educationSchema],
			language: [languageSchema],
			project: [projectSchema],
			employer: [employerSchema]
		}),
		mediaSchema = mongo.Schema({
			img: String,
			link: String
		}),
		projectSchema = mongo.Schema({
			tags: [String],
			type: [String],
			media: [mediaSchema],

			companyId: String,
			name: String,
			description: String,
			extras: String,
			challenges: String,
			userId: ObjectId
		}),
		employerSchema = mongo.Schema({
			companyId: String,
			name: String,
			logo: String,
			link: String,
			description: String,
			projects: [ObjectId],
			departure: String,
			extras: String,
			timeframe: {
				join: { type:Date, default:Date.now}
				,leave: { type:Date, default: Date.now}
			},
			userId: ObjectId
		}),
		skillSchema = mongo.Schema({
			name: String,
			value: Number,
			userId: { type: ObjectId, ref: 'User' },
			frameworks: [skillSchema],
			userId: ObjectId
		}),
		educationSchema = mongo.Schema({
			type: String,
			name: String,
			timeframe: {
				join: { type:Date, default:Date.now}
				,leave: { type:Date, default: Date.now}
			},
			link: String,
			location: String,
			specialty: String,
			paper: String,
			extras: String,
			userId: ObjectId
		});
	// db items
		var Skill = mongo.model('Skill', skillSchema),
			School = mongo.model('School', educationSchema),
			Employer = mongo.model('Employer', employerSchema),
			Project = mongo.model('Project', projectSchema),
			User = mongo.model('User', userSchema),
			Language = mongo.model('Language', languageSchema),
			Social = mongo.model('Social', socialSchema)
			_items = {
				SOCIAL: {
					value: "social",
					model: Social
				},
				SCHOOL: { 
					value: "school",
					model : School
				},
				SKILL: {
					value: "skill",
					model: Skill
				},
				EMPLOYER: {
					value: "employer",
					model: Employer
				},
				PROJECT: {
					value: "project",
					model: Project
				},
				USER:{
					value: "user",
					model: User
				},
				LANGUAGE: {
					value: "language",
					model: Language
				}
			}
	// handlers
		_getModel = function(type){
			var model;
			for (var ii in _items){ if (_items[ii].value === type){ model = _items[ii].model; break; }}
			if (!model) {trace("\tMONGO:: no such type exists: '"+type+"'"); return;}
			return model;
		}

		_getItems = function(type, addon){
			var model = _getModel(type), def = q.defer(),
				addon = addon || {};

			if (model){
				trace("\tMONGO:: request items of type '"+type+"'");
				model.find(addon)
				.exec(function(e, docs){
					if (e){
						trace("\tMONGO:: request failed");
						def.reject(e)
					}
					trace("\tMONGO:: found: "+(docs ? docs.length : 0)+" items");
					def.resolve(docs);
				})
			}else{
				trace("\tMONGO:: no model available")
				def.reject()
			}
			return def.promise;
		}
		_getItemByValue = function(type, attribute, value){
			var model = _getModel(type), def = q.defer(), obj = {};

			if(model){
				obj[attribute] = value
				trace("\tMONGO:: request items of type '"+type+"' -> "+attribute+"="+value);
				
				model.findOne(obj, null, function(e, item){
					if (e){
						trace("\tMONGO:: request failed");
						def.reject()
					}

					if (item){
						def.resolve(item);	
					}else{
						trace("\tMONGO:: no item combination found");
						def.reject()
					}
					
				})
			}else{
				trace("\tMONGO:: no model available")
				def.reject()
			}

			return def.promise;
		}
		_setItem = function(item, extras){
			var model = _getModel(item._type), def = q.defer(), inst;
			trace('\tMONGO:: request set item: '+item._type+" with id: "+item._id)
			
			if (extras){
				trace('\t--- setting '+item._type+' with: '+JSON.stringify(extras));	
			}
			
			if (model){
				if (item._id){
					// UPDATE ITEM IN DB
					trace('\tMONGO:: update information')
					
					try{
						item = item.toObject();
						// // convert mongo object to js object
						trace('\tMONGO:: ---> convert to js object')
					}catch(e){}
					
					var id = item._id;
					delete item._id;

					model.findOneAndUpdate({ _id: id}, item, function(e, docs){
						if (e){
							trace('\tMONGO:: failed to update')
							def.reject(e)
						}else{
							if (docs){
								trace('\tMONGO:: -> update successful')
								def.resolve(docs)
							}else{
								trace("\tMONGO:: -> didn't find anything to update")
								def.reject("Error: '"+type+"' could not be modified");
							}
							
						}
					})				
					id = null;
				}else{
					// INSERT INTO DB
					inst = new model(item);
					trace('\tMONGO:: insert information')
					inst.save(function(e, docs){
						if (e){
							trace('\tMONGO:: failed to insert')
							def.reject(e);
						}else{
							trace('\tMONGO:: -> insert successful')
							docs.__index = extras;
							def.resolve(docs)
						}
					})
				}
			}else{
				trace("\tMONGO:: no model available")
				def.reject()
			}
			return def.promise;
		}
		_removeItemById = function(type, id){
			var model = _getModel(type),
				def = q.defer()
			trace('\tMONGO:: remove item')

			if(model){
				model.remove({ _id: id})
				.exec(function(err){
					if (err){
						def.reject();
						trace('\tMONGO:: removal failed - '+err)
					}else{
						def.resolve();	

					}
				})
			}else{
				trace('\tMONGO:: removal failed - no model available')
				def.reject({ reason: 'no model available'});
			}
			return def.promise;
		}

	return {
		getItems: _getItems,
		getItemByValue: _getItemByValue,
		setItem: _setItem,
		removeItemById: _removeItemById,
		type: _items
	}
}