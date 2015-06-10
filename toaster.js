(function() {
  'use strict';

  /*
   * AngularJS Toaster
   * Version: 0.4.9
   *
   * Copyright 2013 Jiri Kavulak.
   * All Rights Reserved.
   * Use, reproduction, distribution, and modification of this code is subject to the terms and
   * conditions of the MIT license, available at http://www.opensource.org/licenses/mit-license.php
   *
   * Author: Jiri Kavulak
   * Related to project of John Papa and Hans Fjällemark
   */

  angular.module('toaster', ['ngAnimate'])
      .service('toaster', ['$rootScope', function($rootScope) {
        this.pop = function(type, title, body, timeout, bodyOutputType, actions, uid) {
          if(angular.isObject(type)) {
            var params = type; // NOTE: anable parameters as pop argument
            this.toast = {
              type: params.type,
              title: params.title,
              body: params.body,
              timeout: params.timeout,
              bodyOutputType: params.bodyOutputType,
              clickHandler: angular.isArray(params.actions) ? params.actions[0] : params.actions,
              actions: angular.isArray(params.actions) && params.actions,
              uid: params.uid
            };
          }
          else {
            this.toast = {
              type: type,
              title: title,
              body: body,
              timeout: timeout,
              bodyOutputType: bodyOutputType,
              clickHandler: angular.isArray(actions) ? actions[0] : actions,
              actions: angular.isArray(actions) && actions,
              uid: uid
            };
          }
          this.toast.icon = this.getIcon(this.toast.type);

          $rootScope.$emit('toaster-newToast');
        };

        this.getIcon = function(type) {
          if(type === 'error' || type === 'warning' || type === 'danger') return 'alert';
          if(type === 'success') return 'ok';
          return 'info-sign';
        };

        this.clear = function() {
          $rootScope.$emit('toaster-clearToasts');
        };
      }])
      .constant('toasterConfig', {
        'limit': 0,                   // limits max number of toasts
        'tap-to-dismiss': true,
        'close-button': false,
        'newest-on-top': true,
        //'fade-in': 1000,            // done in css
        //'on-fade-in': undefined,    // not implemented
        //'fade-out': 1000,           // done in css
        // 'on-fade-out': undefined,  // not implemented
        //'extended-time-out': 1000,    // not implemented
        'time-out': 5000, // Set timeOut and extendedTimeout to 0 to make it sticky
        'icon-classes': {
          primary: 'bg-primary',
          info: 'bg-info',
          wait: 'bg-wait bg-info',
          danger: 'bg-danger',
          success: 'bg-success',
          warning: 'bg-warning'
        },
        'body-output-type': '', // Options: '', 'trustedHtml', 'template'
        'body-template': 'toasterBodyTmpl.html',
        'icon-class': 'toast-info',
        'position-class': 'toast-top-right',
        'title-class': 'toast-title',
        'message-class': 'toast-message'
      })
      .directive('toasterContainer', ['$compile', '$rootScope', '$interval', '$sce', 'toasterConfig', 'toaster',
        function($compile, $rootScope, $interval, $sce, toasterConfig, toaster) {
          return {
            replace: true,
            restrict: 'EA',
            scope: true, // creates an internal scope for this directive
            link: function(scope, elm, attrs) {

              var id = 0,
                  mergedConfig;

              mergedConfig = angular.extend({}, toasterConfig, scope.$eval(attrs.toasterOptions));

              scope.config = {
                position: mergedConfig['position-class'],
                title: mergedConfig['title-class'],
                message: mergedConfig['message-class'],
                tap: mergedConfig['tap-to-dismiss'],
                closeButton: mergedConfig['close-button'],
                animation: mergedConfig['animation-class']
              };

              scope.configureTimer = function configureTimer(toast) {
                var timeout = typeof (toast.timeout) == "number" ? toast.timeout : mergedConfig['time-out'];
                if(timeout > 0) {
                  setTimeout(toast, timeout);
                }
              };

              function addToast(toast) {
                toast.type = mergedConfig['icon-classes'][toast.type];
                if(!toast.type) {
                  toast.type = mergedConfig['icon-class'];
                }

                id++;
                angular.extend(toast, {id: id});

                // Set the toast.bodyOutputType to the default if it isn't set
                toast.bodyOutputType = toast.bodyOutputType || mergedConfig['body-output-type'];
                switch(toast.bodyOutputType) {
                  case 'trustedHtml':
                    toast.html = $sce.trustAsHtml(toast.body);
                    break;
                  case 'template':
                    toast.bodyTemplate = toast.body || mergedConfig['body-template'];
                    break;
                }

                scope.configureTimer(toast);

                if(mergedConfig['newest-on-top'] === true) {
                  scope.toasters.unshift(toast);
                  if(mergedConfig['limit'] > 0 && scope.toasters.length > mergedConfig['limit']) {
                    scope.toasters.pop();
                  }
                } else {
                  scope.toasters.push(toast);
                  if(mergedConfig['limit'] > 0 && scope.toasters.length > mergedConfig['limit']) {
                    scope.toasters.shift();
                  }
                }
              }

              function setTimeout(toast, time) {
                toast.timeout = $interval(function() {
                  scope.removeToast(toast.id);
                }, time);
              }

              scope.toasters = [];
              $rootScope.$on('toaster-newToast', function() {
                var uid = toaster.toast.uid,
                    dupe = false;

                if(uid) {
                  for(var i = 0, l = scope.toasters.length; i < l; i++) {
                    var toast = scope.toasters[i];
                    if(toast.uid && toast.uid === uid) {
                      dupe = toast;
                      break;
                    }
                  }
                }

                if(dupe) {
                  scope.restartTimer(dupe);
                }
                else {
                  addToast(toaster.toast);
                }
              });

              $rootScope.$on('toaster-clearToasts', function() {
                scope.toasters.splice(0, scope.toasters.length);
              });
            },
            controller: ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {

              $scope.stopTimer = function(toast) {
                if(toast.timeout) {
                  $interval.cancel(toast.timeout);
                  toast.timeout = null;
                }
              };

              $scope.restartTimer = function(toast) {
                if(!toast.timeout) {
                  $scope.configureTimer(toast);
                }
              };

              $scope.removeToast = function(id) {
                var i = 0;
                for(i; i < $scope.toasters.length; i++) {
                  if($scope.toasters[i].id === id) {
                    break;
                  }
                }
                $scope.toasters.splice(i, 1);
              };

              $scope.click = function(toaster, isCloseButton) {
                if($scope.config.tap === true) {
                  var removeToast = true;
                  if(toaster.clickHandler) {
                    if(angular.isFunction(toaster.clickHandler)) {
                      removeToast = toaster.clickHandler(toaster, isCloseButton);
                    }
                    else if(angular.isFunction($scope.$parent.$eval(toaster.clickHandler))) {
                      removeToast = $scope.$parent.$eval(toaster.clickHandler)(toaster, isCloseButton);
                    }
                    else {
                      console.log("TOAST-NOTE: Your click handler is not inside a parent scope of toaster-container.");
                    }
                  }
                  if(removeToast) {
                    $scope.removeToast(toaster.id);
                  }
                }
              };
            }],
            template:
            '<div id="toast-container" class="toast-container" ng-class="[config.position, config.animation]">' +
              '<div ng-repeat="toaster in toasters" class="toast" ng-class="toaster.type" ng-click="click(toaster)" ng-mouseover="stopTimer(toaster)"  ng-mouseout="restartTimer(toaster)" id="{{toast.uid || \'toast-\' + $index}}">' +
                '<button class="toast-close-button" ng-show="config.closeButton" ng-click="click(toaster, true)">&times;</button>' +
                '<i class="glyphicon glyphicon-{{toaster.icon}}"></i>' +
                '<h3 ng-class="config.title">{{toaster.title}}</h3>' +
                '<div ng-class="config.message" ng-switch on="toaster.bodyOutputType">' +
                  '<div ng-switch-when="trustedHtml" ng-bind-html="toaster.html"></div>' +
                  '<div ng-switch-when="template"><div ng-include="toaster.bodyTemplate"></div>' +
                '</div>' +
                '<div ng-switch-default >{{toaster.body}}</div>' +
                '</div>' +
                '<div ng-if="toaster.actions" class="toast-actions">' +
                  '<button ng-repeat="action in toaster.actions" class="btn btn-block {{action.buttonStyle}}" ng-click="action.click();click(toaster, true)">{{action.text}}</button>' +
                '</div>' +
              '</div>' +
            '</div>'
          };
        }]);
})(window, document);