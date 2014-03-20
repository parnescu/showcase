module.exports = function(){
	var db = require('../database.js')(config),
		fs = require('fs'),
		q = require('q'),
		path = require('path'),
		trace = function(m){ console.log(m)},
		RESOURCE_PATH = path.join(__dirname,"../../public"),
		userItems = ["social","school","language","skill","employer","project"]

	// html paths
		pathIndex = function(a,b){
			pathRender(a,b,'index');
		}
		pathAdmin = function(a,b){
			pathRender(a,b,'admin');			
		}
		pathPartial = function(a,b){
			pathRender(a,b,'partials/admin-'+a.params.id);
		}
		pathRender = function(req, res, path){
			res.render(path);
		}
	// utils
		_mergeExtras = function(userData, items){
			for(var i=0;i<userItems.length;i++){
				userData[userItems[i]] = items[i];
			}
		}
		_stripExtras = function(userData){
			var tmp = {}, i, type;
			for(i=0;i<userItems.length;i++){
				type = userItems[i];
				tmp[type] = userData[type];
				delete userData[type];
			}
			return tmp;
		}
	// admin paths
		_uploadFile = function(req, res){
			var _img = req.files,
				acceptedFileTypes = ['image/jpeg', 'image/jpg', 'image/bmp', 'image/png'],
				maxSize = 100*5000,
				fileName, customPath = null;

			if (_img.file){
				_img = _img.file;
				if (_img.size < maxSize && acceptedFileTypes.indexOf(_img.type) != -1){
					trace("ROUTER:: UPLOAD:: file size & type accepted ");
					
					fileName = _img.originalFilename.split('.');
					extension = fileName[fileName.length-1];

					fileName.pop();
					fileName.push(Date.now());
					fileName.push(extension);
					fileName = fileName.join('.');

					// if customPath folder is not created on the server the upload WILL fail
					customPath = "/res/"+(req.body.customPath ? req.body.customPath+"/" : "");
					trace('ROUTER:: UPLOAD:: save file: '+customPath);

					fs.readFile(_img.path, function(err, data){
						if (err) {
							trace("ROUTER:: something went wrong");
							res.json({success: false, reason: "Could not read given file"})
						}
						//trace(RESOURCE_PATH+customPath+fileName)
						
						fs.writeFile(RESOURCE_PATH+customPath+fileName, data, function(err){
							if (err) {
								trace("ROUTER:: something went wrong");
								res.json({success: false, reason: "Could not write file on server '"+customPath+fileName+"'"})
							}

							trace("ROUTER::  -> finished uploading");
							res.json({ 
								success: err ? false : true,
								name: customPath+fileName,
							});
						})
					});
				}
			}else{
				trace("ROUTER:: UPLOAD:: fail");
				res.json({success: false, reason: "no file given"})
			}
		}
		_removeFile = function(req, res){
			if (req.body.file){
				trace("ROUTER:: trying to remove file: "+req.body.file);
				fs.unlink(RESOURCE_PATH+req.body.file, function(err){
					var success = err ? true : false;
					trace("ROUTER:: -> file removed: "+success);
					res.json({success:success, reason: "File is not on server"})
				})
			}else{
				trace("ROUTER:: no file removed");	
				res.json({success: false, reason: 'no file given'});
			}
			
		}
		_parseUser = function(userData){
			var def = q.defer(),j, promises = [];
			trace('PARSE_USER:: parsing data for: '+userData.name);
			
			for (j=0;j<userItems.length;j++){
				promises.push(_getUserItemsByType(userItems[j],userData._id))		
			}

			q.all(promises).then(
				function(data){
					for (j=0;j<userItems.length;j++){
						if (typeof(data[j]) === "object"){
							userData[userItems[j]] = data[j];
						}
					}
					trace('PARSE_USER:: done')
					def.resolve(userData);
				},
				function(e){
					trace('PARSE_USER:: failed')
					def.reject(e);
				}
			)
			return def.promise;
		}
		_getUserItemsByType = function(type, userId){
			return db.getItems(type, { userId: userId})
		}
		_getUsers = function(req, res){
			var i,j, promises = [], id;
			trace("GET_USERS:: users requested")
			id = req.params.id;
			db.getItems(db.type.USER.value, (id ? {_id: id} : {}))
			.then(function(userData){
					trace("GET_USERS:: -> success ... get extras for each user")
					for (i=0;i<userData.length;i++){
						promises.push(_parseUser(userData[i]));
					}
					q.all(promises).then(
						function(data){
							trace('GET_USERS:: done');
							setTimeout(function(){
								
								res.json({success:true, data:data})

							},1000)
						}
						,function(e){
							trace('GET_USERS:: failed');
							res.json({success:false, reason:e})
						}
					)
				},function(e){ 
					trace("GET_USERS:: fail to find data")
					res.json({success: false, reason: "no data found"})
				}
			)
		}
		_addItems = function(pkg, type, userId){
			var def = q.defer(),i, promises = [], pkg = pkg || [];
			for (i=0;i<pkg.length;i++){
				pkg[i]._type = type;
				pkg[i].userId = userId;
				promises.push(db.setItem(pkg[i]));
			}

			q.all(promises).then(
				function(data){
					for (i=0;i<data.length;i++){
						if(typeof(data[i]) === "number"){
							data[i] = pkg[i];
							trace('--- it was a modification not an insert')
						}
					}
					def.resolve(data);
				},
				function(e){
					def.reject(e);
				}
			)
			return def.promise;
		}
		_add = function(req, res){
			var data = req.body, i, temp
				pkg = data.package,
				promises = [],
				type = req.params.type;

			trace("ROUTER:: add/update for type: "+type);
			if (type === db.type.USER.value){
				temp = _stripExtras(pkg);
				pkg._type = type;
				pkg._isNew = !pkg.hasOwnProperty('_id');

				db.setItem(pkg).then(
					function(data){
						trace('ROUTER:: -> success set user')
						
						if (pkg._isNew){
							trace('ROUTER:: user is new ... add extras')
							pkg = data;

							for(i=0;i<userItems.length;i++){
								type = userItems[i];
								promises.push(_addItems(temp[type], type, data._id))
							}

							q.all(promises).then(
								function(data){
									trace('ROUTER:: extras added');
									_mergeExtras(pkg, data);
									res.json({success:true, data:pkg})
								}
								,function(e){
									trace('ROUTER:: failed to add extras for user')
									res.json({success:false, reason:e})
								}
							)
						}else{
							res.json({success:true, data:data})
						}
					}
					,function(e){
						trace('ROUTER:: failed to add/update '+type)
						res.json({success:false, reason:e})
					}
				)
			}else{
				if (data.userId){
					_addItems(pkg, type, data.userId).then(
						function(data){
							res.json({success:true, data:data})
						}
						,function(e){
							res.json({success:false, reason:e})
						}
					);
				}
			}
		}
		_remove = function(req, res){
			trace("ROUTER:: remove item ("+req.params.type+":"+req.params.id+")");
			db.removeItemById(req.params.type, req.params.id).then(
				function(data){
					trace("ROUTER:: -> item removed successful");
					res.json({success:true})
				},
				function(e){
					res.json({success:false, reason:e})
				}
			);
		}
		_doNothing = function(req, res){
			res.json({ success: 'maybe', reason: "these are not the droids you are looking for"});
		}
		
	return {
		index: pathIndex
		,admin: pathAdmin
		,adminRedirect: pathAdmin
		,adminPartial: pathPartial
		
		,getUsers: _getUsers
		,removeItem: _remove
		,updateItem: _add
		,addItem: _add

		,upload: _uploadFile
		,remove: _removeFile
		,nowhere: _doNothing
	}
} 