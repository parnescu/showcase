var trace = function(m){console.log(m);}

angular.module('showcase',['ngTouch','ngRoute'])
	// .config(['$routeProvider','$locationProvider',function($routeProvider,$locationProvider){
	// 	$locationProvider.html5Mode(true)
	// 	$routeProvider
	// 		.when('section/:id', {

	// 		})
	// 		.otherwise({ redirectTo: "/"})
	// }])
	.service('Loader',['$q', '$http', function($q, $http){
		return {
			getResource: function(link, method){
				method = method || "GET";
				var q = $q.defer();
				$http({url: link, method:method}).success(q.resolve).error(q.reject);
				return q.promise;
			}
		}
	}])
	.controller('MainCtrl', ['$scope', 'Loader', '$sce', '$location', function($scope, Loader, $sce, $location){
		$scope.currentBkgId = 0;
		$scope.currentArticle = null;
		$scope.loadedData = null;
		$scope.currentEducation = 0;
		$scope.currentFilter = null;
		$scope.currentProject = null;
		
		$scope.changeBackground = function(e){
			e.preventDefault();
			$scope.currentBkgId = e.target.dataset.id
		}
		$scope.showArticle = function(e){
			e.preventDefault();	
			$scope.currentArticleId = ($scope.currentArticleId && $scope.currentArticleId === e.target.dataset.id) ? null : e.target.dataset.id;		
			$('body').delay(100).animate({ scrollTop: ($(e.target).parent().parent().parent()[0].offsetTop - 10) + "px"})	
			
		}

		$scope.changeSlide = function(e, current){
			e.preventDefault();
			$scope.currentEducation = parseInt(e.target.dataset.id);
		}
		$scope.changeSlideBySwipe = function(direction, current){
			current += parseInt(direction == 'left' ? -1 : 1)
			if (current > -1 && current <= $scope.loadedData.school.length-1){
				$scope.currentEducation = current;
			}
		}

		$scope.showFrameworks = function (e, skill){
			e.preventDefault();
			if (skill.frameworks && skill.frameworks.length>0){
				skill._selected = !(skill._selected === undefined ? false : skill._selected);	
			}
		}
		$scope.showProject = function(e, index){
			e.preventDefault();
			$scope.currentProject = $scope.loadedData.project[index];
			$scope._temp = $('body').scrollTop()+"px"

			$('#main').addClass('withProject')
			$('#page').css('top', -($('#main').height()+$('#head').height())+"px")
		}
		$scope.hideProject = function(e){
			e.preventDefault();
			$scope.currentProject = null;
			$('#main').removeClass('withProject')
			$('#page').css('top',0);
		}
		$scope.clearFilters = function(e){
			e.preventDefault();
			$scope.loadedData.projects.forEach(function(item, index){
				item.enabled = true;
			})
		}
	
		$scope.init = function(userId){
			userId = userId || '538318b45707460200a7d888';

			Loader.getResource('api/users/'+userId);
			.then(
				function(results){
					if (results.success){
						$scope.loadedData = results.data[0];
						$scope.loadedData.school.forEach(function(item){
							// //var tmp = item.link.split(',');
							// item._center = { latitude:44.4253262, longitude:26.1780795}
							// item._zoom = parseInt(tmp[2]) || 18;
							// tmp = null;
							item._link = $sce.trustAsResourceUrl(item.link)
						})
						trace($scope.loadedData);
					}
				},
				function(e){
					alert('boom... something went bad')
				}
			);
		}

		$scope.init();
		
	}])

angular.bootstrap(document, ['showcase'])