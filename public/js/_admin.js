trace = function(m){console.log(m);}
window.scroll(0,1);
"use strict";

$.datepicker.setDefaults({
	changeMonth: true,
	changeYear: true,
	dateFormat: "dd MM yy",
	//buttonImage: "/res/_img/calendaricon.jpg",
	buttonImageOnly: true,
	buttonText: "Select date",
	showOn: "both"
});

MAX_FILE_SIZE = 500000;
// angular module definition
	angular.module("myAdmin", ['ngRoute','angularFileUpload'])
	.config(["$routeProvider", "$locationProvider", function($routeProvider, $location){
		$location.html5Mode(true);
		$routeProvider
			.when('/admin/:id',{
				templateUrl: function(params) { return "/admin/partials/"+(params.action || "details")},
				reloadOnSearch: true
			})
			.otherwise({ redirectTo: "/admin"});
	}])
	.directive('datepick', function() {
	    return {
	        restrict: 'A',
	        require : 'ngModel',
	       	scope: {
	      		ngModel: '='
	    	},
	        link: function(scope, element, attrs) {       	
	        	var obj = {}, defDate = new Date();
	        	if (attrs.hasOwnProperty('range')){ obj.yearRange = attrs.range; }
	        	if (attrs.hasOwnProperty('rangeyear')){ defDate = new Date(Date.now() - (attrs.rangeyear*356*24*60*60*1000))}
				
				scope.ngModel = scope.ngModel || defDate;
	        	scope.ngModel = scope.$parent.parseDate(scope.ngModel)
	        	element.datepicker(obj);
	        	
	        	obj = null;
	        }
	    };
	})
	.service('Communicator', ["$http", "$q", "$upload", "$rootScope", function($http, $q, $uploader, $rootScope){
		_makeRequest = function(userData, link, method){
			var def = $q.defer(),
				lnk = "/api/"+link,
				mth = method || "GET"

			$rootScope._loadingInProgress = true;
			$http({ method: mth, url:lnk, data:userData})
				.success(function(data){
					$rootScope._loadingInProgress = false;
					def.resolve(data);
				})
				.error(function(){
					def.reject({reason: "could not communicate with server corectly"});
				})
			return def.promise;
		}
		return {
			remove: function(data, type){
				type += data._id ? "/"+data._id : ""
				return _makeRequest(data, type, "DELETE");
			},
			save: function(userData, type, userID){
				var mth = userData._id ? "PUT" : "POST",
					type = type || "user"
					lnk = type + (userData._id ? "/"+userData._id : "");
					
				return _makeRequest({ userId: userID, package: userData}, lnk, mth)
			},
			getUsers: function(){
				return _makeRequest(null, "users", 'GET')
			},
			removeFile: function(fileName){
				return _makeRequest({ file: fileName}, "fileRemove", "POST");
			},
			addFiles: function($files, path){
				var i, file, def = $q.defer(), obj = {}
				for (i=0;i<$files.length;i++){
					file = $files[i];

					if (file.size > MAX_FILE_SIZE) {
						setTimeout(function(){ 
							def.reject({ reason: "the picture you selected is bigger than "+(MAX_FILE_SIZE/1024).toFixed(2)+"kb, try uploading a smaller version!"})
						}, 100);
					}

					if (path){
						obj.customPath = path;
					}

					$uploader.upload({ url: "/api/fileUpload", file: file, data: obj})
					.success(function(data){
						if (data.success === true){
							def.resolve(data);	
						}else{
							def.reject(data);	
						}
					}).error(function(e){
						def.reject(e);
					})
				}
				return def.promise;
			}
		}
	}])
	.service('ReloadWatcher', ["$location", function($location){
		return {
			init: function($scope){
				$scope.$on('$routeChangeSuccess', function (ev, current, prev) {
					var i, arr;
					if (prev && prev.params.action){
						arr = $scope.cu ? $scope.cu[prev.params.action] || [] : [];
						
						for (i=0;i<arr.length;i++){
							if (Object.keys(arr[i]).length < 3){
								arr.pop()
							}
						}
					}
					$scope._currentTab = current.params.action || "details";

			   		if (current.params.id && !$scope.cu){
			   			for (i=0;i<$scope.users.length;i++){
			   				if ($scope.users[i]._id === current.params.id){
			   					$scope.cu = $scope.users[i];
			   					$scope.cIndex = i;
			   					$scope.saveButton = "update";
			   					return;	
			   				}
			   			}
			   			$location.path('/admin');
			   		}
				});
			}
		}
	}])
	.controller('MainCtrl',["$scope", "$location", "$route", "Communicator", "ReloadWatcher", function($scope, $location, $route, API, watcher){
		watcher.init($scope)

		$scope.users = [];	// users collection
		
		$scope.form = document.getElementById('dataForm');
		$scope.tabs = [
			{ id: "details",	name: "Details"}
			,{ id: "social", 	name: "Socia Media"}
			,{ id: "school", 	name: "Education"}
			,{ id: "language", 	name: "Lingual Skills"}
			,{ id: "skill", 	name: "Tech Skills"}
			,{ id: "employer",	name: "Employers"}
			,{ id: "project", 	name: "Assignment History"}
		];

		$scope.months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
		$scope.saveButton = "save";
		$scope.userAction = "new user";
		$scope._menuVisible = true;
		$scope._showMessage = false;
		$scope._menuText = "show";
		$scope._currentTab = null


		$scope.parseDate = function(date){
			date = typeof(date) != 'date' ? new Date(date) : date;
			return date.getDate()+" "+$scope.months[date.getMonth()]+" "+date.getFullYear()
		}

		$scope._reset = function(){
			$scope.cu = null;
			$scope.cIndex = 0;
		}

		$scope.saveSuccess = function(e){
			var msg = e ? e.reason : 'done',
				delay = msg.length*60;

			$('.alert')
				.hide()
				.html(msg)
				.slideDown().delay(delay).slideUp();
		}
		$scope.saveUser = function(e){

			var page = $location.search();

			if (page.hasOwnProperty('action') && page.action != 'details'){
				// we're on another page go to the main page
				
				if($scope.form.checkValidity()){
					if ($scope.cu._id){
						var arr = $scope.cu[page.action]
						
						if (arr.length < 1) {
							//trace(page.action)
							$location.search("action", "details");
							return;
						};

						API.save(arr, page.action, $scope.cu._id).then(function(response){
						 	trace(response);
						 	if (response.success === true){
						 		$scope.cu[page.action] = response.data	
						 		$scope.saveSuccess();
						 	}else{
						 		$scope.cu[page.action] = null;
						 		$scope.saveSuccess(response);
						 	}
						},$scope.saveSuccess)
						//$location.search("action", "details");
					}else{
						$location.search("action", "details");	
					}
				}
			}else{
				// save full object
				trace($scope.cu)
				API.save($scope.cu).then(function(savedData){
					trace(savedData);
					if (savedData.success){
						if (savedData.data){
							$scope.users[$scope.cIndex] = savedData.data;
						}
						trace('--- yep.. all good')

						$scope.cu = null;
						$scope.cIndex = null;
						$scope.saveButton = "save";
						$scope.saveSuccess();

						$location.path('/admin')
					}
				},$scope.saveSuccess)
			}
		}
		$scope.showUser = function(e, index){
			e.preventDefault();
			$scope._reset();

			$scope.cu = $scope.users[index];
			$scope.cIndex = index;
			$scope.saveButton = "update";
			$scope.userAction = "user details"
			

			$location.path('/admin/'+$scope.cu._id);
		}
		$scope.addUser = function(e){
			e.preventDefault();

			var nr = $scope.users.push({})
			$scope.cu = $scope.users[nr-1];
			$scope.cIndex = nr-1;
			
			$location.path('/admin/new');
		}
		$scope.hideUser = function(e){

			var page = $location.search().action;
			if (page){
				trace('clear empty items for '+page)	
				
				trace($scope.form.checkValidity())
				trace($scope.cu[page]);
			}


			if (!$scope.cu._id){ $scope.users.pop();}

			$scope._reset();
			$scope.saveButton = "save";
			$scope.userAction = "new user"

			$location.path('/admin');
		}

		$scope.removeItem = function(e, index, arr, path){
			var item = arr[index];
			
			if (item && item.hasOwnProperty('_id') && path){
				API.remove(item, path).then($scope.saveSuccess, $scope.saveSuccess);
				item = null;
			}
			e.preventDefault();
			arr.splice(index,1)

		}
		$scope.addItem = function(e, object, attr){
			e.preventDefault();
			if (object){
				object[attr] = object[attr] || [];
				if ($scope.form.checkValidity()){
					object[attr].push({});
				}
			}
		}
		$scope.addInnerItem = function(e, obj, attr){
			e.preventDefault();
			
			var value = obj["_"+attr];
			obj[attr] = obj[attr] || [];
			
			if (value && obj[attr].indexOf(value) === -1){
				obj[attr].push(value);
			}
			value = null;
			delete obj["_"+attr]
		}

		$scope.initFile = function(e, id){
			e.preventDefault();
			$(e.target).parent().find('input[type=file]').click();
		}
		$scope.removeFile = function(e, target, attr){
			if (e){ e.preventDefault();}
			API.removeFile(target[attr]).then(
				function(){ 
					target[attr] = null;
					$scope.saveSuccess();
				}
				,$scope.saveSuccess
			)
		}
		$scope.addFile = function($files, target, attr, path){
			if (target[attr]){ $scope.removeFile(null, target, attr);}

			API.addFiles($files, path).
			 	then(
			 		function(data){ 
			 			target[attr] = data.name;
			 			$scope.saveSuccess();
			 		}
			 		,$scope.saveSuccess
			 	);
		}

		$scope.toggleMenu = function(e){
			e.preventDefault();
			$scope._menuVisible = !$scope._menuVisible;
			$scope._menuText = $scope._menuVisible ? "hide" : "show";
		}

		$scope._reset();
		API.getUsers().then(function(response){$scope.users = response.data || [];})
	}]);

angular.bootstrap(document.body, ['myAdmin']);
