var trace = function(d){console.log(d)}

angular.module('myApp', ['angularFileUpload'])
.controller('MyCtrl', ['$scope', '$upload', function($scope, $upload){
	

	$scope.onFileSelect = function($files){
		trace($files);
		for (var i = 0; i < $files.length; i++) {
			var file = $files[i];
			$scope.upload = $upload.upload({
				url: '/api/fileUpload', //upload.php script, node.js route, or servlet url
				// method: POST or PUT,
				// headers: {'headerKey': 'headerValue'},
				// withCredentials: true,
				data: {myObj: $scope.myModelObj},
				file: file,
				// file: $files, //upload multiple files, this feature only works in HTML5 FromData browsers
				/* set file formData name for 'Content-Desposition' header. Default: 'file' */
				//fileFormDataName: myFile, //OR for HTML5 multiple upload only a list: ['name1', 'name2', ...]
				/* customize how data is added to formData. See #40#issuecomment-28612000 for example */
				//formDataAppender: function(formData, key, val){} //#40#issuecomment-28612000
			}).progress(function(evt) {
				console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
			}).success(function(data, status, headers, config) {
				// file is uploaded successfully
				console.log(data);
			})
			.error(function(){
				trace('naaaah... is an errrorrr')
			})
			// .then(success, error, progress); 
		}
	}
}])

angular.bootstrap(document.body, ['myApp']);