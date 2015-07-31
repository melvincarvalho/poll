/* global angular */
'use strict'; // jshint ignore:line


angular.module('lumx.dialog', [])
    .service('LxDialogService', ['$rootScope', '$timeout', '$interval', '$window', function($rootScope, $timeout, $interval, $window)
    {
        var self = this,
            dialogInterval,
            dialogFilter,
            dialogHeight,
            windowHeight,
            activeDialogId,
            scopeMap = {},
            dialog,
            dialogHeader,
            dialogContent,
            dialogActions,
            dialogScrollable,
            resizeDebounce;

        this.registerScope = function(dialogId, dialogScope)
        {
            scopeMap[dialogId] = dialogScope;
        };

        this.open = function(dialogId)
        {
            activeDialogId = dialogId;
            $rootScope.$broadcast('lx-dialog__open-start', dialogId);

            angular.element('body').css({
                overflow: 'hidden'
            });

            dialogFilter = angular.element('<div/>', {
                class: 'dialog-filter'
            });

            dialogFilter.appendTo('body');

            if (angular.isUndefined(scopeMap[dialogId].autoClose) || scopeMap[dialogId].autoClose === 'true')
            {
                dialogFilter.bind('click', function()
                {
                    self.close(dialogId);
                });
            }

            scopeMap[dialogId].element
                .appendTo('body')
                .show();

            $timeout(function()
            {
                scopeMap[dialogId].isOpened = true;

                dialogFilter.addClass('dialog-filter--is-shown');
                scopeMap[dialogId].element.addClass('dialog--is-shown');

                $timeout(function()
                {
                    $rootScope.$broadcast('lx-dialog__open-end', dialogId);
                }, 600);
            }, 100);

            dialogInterval = $interval(function()
            {
                checkDialogHeight(dialogId);
            }, 500);
        };

        this.close = function(dialogId)
        {
            activeDialogId = undefined;
            $rootScope.$broadcast('lx-dialog__close-start', dialogId);
            if (resizeDebounce)
            {
                $timeout.cancel(resizeDebounce);
            }

            $interval.cancel(dialogInterval);

            dialogFilter.removeClass('dialog-filter--is-shown');
            scopeMap[dialogId].element.removeClass('dialog--is-shown');

            if (scopeMap[dialogId].onclose)
            {
                scopeMap[dialogId].onclose();
            }

            $timeout(function()
            {
                angular.element('body').css({
                    overflow: 'visible'
                });

                dialogFilter.remove();

                dialog = undefined;
                dialogHeader = undefined;
                dialogContent = undefined;
                dialogActions = undefined;
                dialogScrollable = undefined;
                
                scopeMap[dialogId].element
                    .hide()
                    .removeClass('dialog--is-fixed')
                    .appendTo(scopeMap[dialogId].parent);

                scopeMap[dialogId].isOpened = false;
                dialogHeight = undefined;
                $rootScope.$broadcast('lx-dialog__close-end', dialogId);
            }, 600);
        };

        function checkDialogHeight(dialogId)
        {
            if (angular.isUndefined(dialogHeader))
            {
                dialog = scopeMap[dialogId].element;
                dialogHeader = dialog.find('.dialog__header');
                dialogContent = dialog.find('.dialog__content');
                dialogActions = dialog.find('.dialog__actions');

                if (angular.isUndefined(dialogHeader))
                {
                    return;
                }
            }

            var dialogMargin = 60;
            var heightToCheck = dialogMargin + dialogHeader.outerHeight() + dialogContent.outerHeight() + dialogActions.outerHeight();

            if (dialogHeight === heightToCheck && windowHeight === $window.innerHeight)
            {
                return;
            }

            dialogHeight = heightToCheck;
            windowHeight = $window.innerHeight;

            if (heightToCheck >= $window.innerHeight)
            {
                dialog.addClass('dialog--is-fixed');

                if (dialog.find('.dialog__scrollable').length === 0)
                {
                    var dialogScrollable = angular.element('<div/>', { class: 'dialog__scrollable' });
                    dialogScrollable
                        .css({ top: dialogHeader.outerHeight(), bottom: dialogActions.outerHeight() })
                        .bind('scroll', checkScrollEnd);

                    dialogContent.wrap(dialogScrollable);
                }
            }
            else
            {
                dialog.removeClass('dialog--is-fixed');

                if (dialog.find('.dialog__scrollable').length > 0)
                {
                    dialogContent.unwrap();
                }
            }
        }

        function checkScrollEnd()
        {
            if (angular.isUndefined(dialogScrollable))
            {
                dialogScrollable = angular.element('.dialog__scrollable');

                if (angular.isUndefined(dialogScrollable))
                {
                    return;
                }
            }

            if (angular.isDefined(scopeMap[activeDialogId].onscrollend))
            {
                if (dialogScrollable.scrollTop() + dialogScrollable.innerHeight() >= dialogScrollable[0].scrollHeight)
                {
                    scopeMap[activeDialogId].onscrollend();

                    dialogScrollable.unbind('scroll', checkScrollEnd);

                    $timeout(function()
                    {
                        dialogScrollable.bind('scroll', checkScrollEnd);
                    }, 500);
                }
            }
        }

        angular.element($window).bind('resize', function()
        {
            if (angular.isDefined(activeDialogId))
            {
                if (resizeDebounce)
                {
                    $timeout.cancel(resizeDebounce);
                }

                resizeDebounce = $timeout(function()
                {
                    checkDialogHeight(activeDialogId);
                }, 200);
            }
        });
    }])
    .controller('LxDialogController', ['$scope', 'LxDialogService', function($scope, LxDialogService)
    {
        this.init = function(element, id)
        {
            $scope.isOpened = false;
            $scope.element = element;
            $scope.parent = element.parent();

            LxDialogService.registerScope(id, $scope);
        };
    }])
    .directive('lxDialog', function()
    {
        return {
            restrict: 'E',
            controller: 'LxDialogController',
            scope: true,
            template: '<div><div ng-if="isOpened" ng-transclude="child"></div></div>',
            replace: true,
            transclude: true,
            link: function(scope, element, attrs, ctrl)
            {
                attrs.$observe('id', function(newId)
                {
                    if (newId)
                    {
                        ctrl.init(element, newId);
                    }
                });

                attrs.$observe('autoClose', function(newValue)
                {
                    scope.autoClose = newValue;
                });

                attrs.$observe('onclose', function(newValue)
                {
                    scope.onclose = function()
                    {
                        return scope.$eval(newValue);
                    };
                });

                attrs.$observe('onscrollend', function(newValue)
                {
                    scope.onscrollend = function()
                    {
                        return scope.$eval(newValue);
                    };
                });
            }
        };
    })
    .directive('lxDialogClose', ['LxDialogService', function(LxDialogService)
    {
        return {
            restrict: 'A',
            link: function(scope, element)
            {
                element.bind('click', function()
                {
                    LxDialogService.close(element.parents('.dialog').attr('id'));
                });
            }
        };
    }]);
