/*
 * Copyright 2007-2012 Charles du Jeu <contact (at) cdujeu.me>
 * This file is part of Pydio.
 *
 * Pydio is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */

Class.create("NotificationLoader", {

    ajxpNode : null,
    pFactory : null,
    timer   : 60,
    pe  : null,
    menuItems : null,
    hasAlerts : false,
    lastEventID:null,
    lastAlertID:null,

    initialize: function(){

        if(window.ajxpMinisite || window.ajxpNoNotifLoader) return;

        var rP = new RemoteNodeProvider();
        rP.initProvider({get_action:'get_my_feed', format:'xml', connexion_discrete:true});
        this.ajxpNode = new AjxpNode("/");
        this.ajxpNode._iNodeProvider = rP;
        this.pFactory = new PreviewFactory();
        this.pFactory.sequencialLoading = false;
        this.pFactory.setThumbSize(44);
        this.ajxpNode.observe('loaded', function(){
            this.menuItems = this.childrenToMenuItems();
        }.bind(this));
        this.pe = new PeriodicalExecuter(function(){
            if(window.ajaxplorer.user){
                this.ajxpNode.reload();
            }
        }.bind(this), this.timer);
        ajaxplorer.observe("server_message", function(message){
            if(XPathSelectSingleNode(message, '//reload_user_feed') && ajaxplorer.user){
                this.ajxpNode.reload();
            }
        }.bind(this));
        document.observe("ajaxplorer:repository_list_refreshed", function(){
            window.setTimeout(function(){
                this.ajxpNode.reload();
            }.bind(this), 100);
        }.bind(this));
        this.ajxpNode.reload();
    },

    childrenToMenuItems : function(callback){
        var menuItems = $A([]);
        var eventIndex = 0;
        var alerts = false;
        var parentAjxpNode = this.ajxpNode;
        var alertsCounts = 0;
        this.hasAlerts = false;
        var newNotifs = $A();
        var currentLastAlert = 0, currentLastEvent = 0;

        this.ajxpNode.getChildren().forEach(function(el){

            // REPLACE REAL PATH NOW
            el._path = el.getMetadata().get("real_path");
            el.getMetadata().set("filename", el._path);
            var isAlert = el.getMetadata().get("event_is_alert") ? true : false;
            if(alerts && !isAlert){
                alerts = false;
                this.hasAlerts = true;
                menuItems.push({separator:true, menuTitle:MessageHash['notification_center.5']});
            }
            if(isAlert){
                if(parseInt(el.getMetadata().get("event_occurence")) > 0){
                    alertsCounts += parseInt(el.getMetadata().get("event_occurence"));
                }else{
                    alertsCounts ++;
                }
                alerts = true;
            }
            var elLabel = el.getLabel();
            if(!elLabel) elLabel = "/";
            var block = '<div class="notif_event_label">'+He.escape(elLabel)+'</div>';
            var detail = '';
            if(el.getMetadata().get('event_repository_label')){
                detail += '<div class="notif_event_repository">'+ el.getMetadata().get('event_repository_label') + '</div>';
            }
            detail += '<div class="notif_event_description">'+ el.getMetadata().get('event_description') + '</div>';
            detail += '<div class="notif_event_date">'+ el.getMetadata().get('event_date') + '</div>';
            block += detail;
            block = '<div class="notif_event_container">'+block+'</div><br style="clear:left;"/>';
            var moreActions = $A([{
                name:MessageHash["notification_center.6"],
                icon_class:"icon-circle-arrow-right",
                callback:function(e){
                    window.ajaxplorer.goTo(el);
                }
            }]);
            if(isAlert){
                var alertID = parseInt(el.getMetadata().get("alert_id"));
                moreActions.push({
                    name:MessageHash["notification_center.7"],
                    icon_class:"mdi mdi-close-circle",
                    callback:function(e){
                        Event.stop(e);
                        Effect.Fade(e.target.up('li'));
                        var conn = new Connexion();
                        conn.onComplete = function(){
                            parentAjxpNode.reload();
                        };
                        var params = {
                            get_action:'dismiss_user_alert',
                            alert_id:alertID
                        };
                        if(el.getMetadata().get("event_occurence")){
                            params.occurrences = el.getMetadata().get("event_occurence");
                        }
                        conn.setParameters(params);
                        conn.sendAsync();
                    }
                });
                if(this.lastAlertID && alertID > this.lastAlertID ){
                    newNotifs.push({
                        title:elLabel,
                        body :detail.stripTags()
                    });
                }
                currentLastAlert = Math.max(alertID, currentLastAlert);
            }else{
                var eventID = parseInt(el.getMetadata().get("event_id"));
                if(this.lastEventID && eventID > this.lastEventID ){
                    newNotifs.push({
                        title:elLabel,
                        body :detail.stripTags()
                    });
                }
                currentLastEvent = Math.max(eventID, currentLastEvent);
            }
            this.lastAlertID = currentLastAlert;
            this.lastEventID = currentLastEvent;
            if(callback){

                callback({
                    id: "event_" + eventIndex,
                    name:block,
                    alt: el.getMetadata().get("event_description_long").stripTags(),
                    pFactory : this.pFactory,
                    ajxpNode:el,
                    callback:function(e){
                        Event.stop(e);
                    },
                    moreActions: moreActions
                });

            }else{

                menuItems.push({
                    id: "event_" + eventIndex,
                    name:block,
                    alt: el.getMetadata().get("event_description_long").stripTags(),
                    pFactory : this.pFactory,
                    ajxpNode:el,
                    callback:function(e){
                        Event.stop(e);
                    },
                    moreActions: moreActions
                });

            }
            eventIndex ++;
        }.bind(this) );
        var button = $('get_my_feed_button');
        if(button){
            var badge = button.down('.badge');
            if(!badge){
                badge = new Element('span', {className:'badge'});
                button.down('.icon-caret-down,img').insert({before: badge});
            }
            if(alertsCounts){
                badge.update(alertsCounts);
                badge.show();
            }else{
                badge.hide();
            }
        }
        if(window.Notification && newNotifs.size()){
            newNotifs.each(function(obje){
                new Notification(
                    obje.title,
                    {
                        body: obje.body,
                        icon: 'plugins/gui.ajax/res/themes/orbit/images/mimes/64/mime_empty.png',
                        tag: 'ajaxplorer',
                        dir: 'auto',
                        lang: ajaxplorer.currentLanguage
                    });
            });
        }
        return menuItems;
    },

    dynamicBuilderLoader : function(action, protoMenu){

        action.builderMenuItems = $A([]);
        action.builderMenuItems.push({
            id:'event_loading',
            name:MessageHash[466],
            alt:'',
            className:'loading_input',
            image:resolveImageSource('images/actions/22/hdd_external_unmount.png', '',  22),
            icon_class:'icon-spinner event_loading',
            callback:function(e){ this.apply(); }.bind(action)
        } );
        var loaderFunc = function(){
            try{
                var menuContainer = protoMenu.container;
            }catch(e){}
            if(!menuContainer) {
                return;
            }
            if(!this.ajxpNode.isLoaded()){
                this.ajxpNode.observe("loaded", function(){
                    protoMenu.options.menuItems = this.menuItems;
                    protoMenu.options.menuTitle = this.hasAlerts ? MessageHash['notification_center.3'] : MessageHash['notification_center.5'];
                    protoMenu.refreshList();
                    this.refreshProtoMenuContainerPosition(protoMenu);
                }.bind(this));
                this.ajxpNode.load();
            }else{
                protoMenu.options.menuItems = this.menuItems;
                protoMenu.refreshList();
                this.refreshProtoMenuContainerPosition(protoMenu);
            }
        }.bind(this);
        protoMenu.options = Object.extend(protoMenu.options, {
            position: "bottom middle",
            menuMaxHeight: 680,
            topOffset: 14,
            menuTitle: this.hasAlerts ? MessageHash['notification_center.3'] : MessageHash['notification_center.5'],
            beforeShow: function(){
                protoMenu.container.removeClassName('panelHeaderMenu');
                protoMenu.container.removeClassName('toolbarmenu');
                protoMenu.container.removeClassName('desktop');
                protoMenu.container.addClassName('rootDirChooser');
                protoMenu.container.addClassName('events_menu');
                protoMenu.container.id = "feed_content";
                if(!this.ajxpNode.isLoaded()){
                    protoMenu.options.menuItems = $A([]);
                    protoMenu.options.menuItems.push({
                        id:'event_loading',
                        name:MessageHash[466],
                        alt:'',
                        image:resolveImageSource('images/actions/22/hdd_external_unmount.png', '',  22),
                        icon_class:'icon-spinner event_loading',
                        callback:function(e){ this.apply(); }.bind(action)
                    } );
                    protoMenu.refreshList();
                }
                window.ajxp_feed_timer = window.setTimeout(loaderFunc, 500);
            }.bind(this),
            beforeHide: function(){
                if(window.ajxp_feed_timer) window.clearTimeout(window.ajxp_feed_timer);
            }
        });
        if(protoMenu.container){
            window.setTimeout(function(){
                protoMenu.container.removeClassName('panelHeaderMenu');
                protoMenu.container.removeClassName('toolbarmenu');
                protoMenu.container.removeClassName('desktop');
                protoMenu.container.addClassName('rootDirChooser');
                protoMenu.container.addClassName('events_menu');
                protoMenu.container.id = "feed_content";
                this.refreshProtoMenuContainerPosition(protoMenu);
                loaderFunc();
            }.bind(this), 50);
        }
    },

    refreshProtoMenuContainerPosition: function(protoMenu){
        var dim = protoMenu.container.getDimensions();
        var offset = protoMenu.computeAnchorOffset();
        protoMenu.container.setStyle(offset);
        protoMenu.correctWindowClipping(protoMenu.container, offset, dim);
    },

    clearMetaCacheForPath: function(path){
        var parts = path.split("/");
        while(parts.length){
            var newPath = parts.join("/");
            if(!newPath) newPath = '/';
            MetaCacheService.getInstance().clearMetaStreamKeys("files.activity" + newPath);
            parts.pop();
        }
    },

    loadInfoPanel : function(container, node){
        if(!NotificationLoader.LOADED){

            pydio.getContextHolder().observe("server_update", function(pathes){
                // Clear all caches for all pathes.
                for(var i = 0; i < pathes.length ; i++){
                    NotificationLoader.prototype.clearMetaCacheForPath(pathes[i]);
                    if(NotificationLoader.IPANEL_FETCHPANE && NotificationLoader.IPANEL_FETCHPANE_PATH && pathes[i].indexOf(NotificationLoader.IPANEL_FETCHPANE_PATH) === 0){
                        NotificationLoader.IPANEL_FETCHPANE.reloadDataModel();
                    }
                }
            });

            NotificationLoader.LOADED = true;
        }

        var label= MessageHash['notification_center.'+(node.isLeaf()?'11': (node.isRoot()?'9': '10'))];
        var mainContainer = container.down("#ajxp_activity_panel");
        mainContainer.addClassName("infopanel_loading");
        container.down("#ajxp_activity_panel").update('<div class="panelHeader" style="display: none;">'+label+'</div><div id="activity_results">Nothing</div>');
        var resultPane = container.down("#activity_results");
        if(node.isLeaf()) resultPane.addClassName('leaf_activity');
        else resultPane.removeClassName('leaf_activity');
        var timer = NotificationLoader.prototype.loaderTimer;
        if(timer) window.clearTimeout(timer);

        NotificationLoader.IPANEL_FETCHPANE_PATH = node.getPath();
        NotificationLoader.IPANEL_FETCHPANE = new FetchedResultPane(resultPane, {
            "fit":"content",
            "replaceScroller": false,
            "columnsDef":[
                {"attributeName":"ajxp_label", "messageId":1, "sortType":"String"},
                {"attributeName":"event_time", "messageString":"Time", "sortType":"Number"},
                {"attributeName":"event_description", "messageString":"Description", "sortType":"String"}
            ],
            "silentLoading":true,
            "fixedSortColumn":"event_time",
            "fixedSortDirection":"desc",
            "muteUpdateTitleEvent":true,
            "nodeProviderProperties":{
                "get_action":"get_my_feed",
                "connexion_discrete":true,
                "format":"xml", "current_repository":"true",
                "feed_type":"notif",
                "limit":(node.isLeaf() || node.isRoot() ? 18 : 4),
                "path":(node.isLeaf() || node.isRoot()?node.getPath():node.getPath()+'/'),
                "merge_description":"true",
                "description_as_label":node.isLeaf()?"true":"false",
                "cache_service":{
                    "metaStreamName":"files.activity" + node.getPath(),
                    "expirationPolicy":MetaCacheService.EXPIRATION_MANUAL_TRIGGER
                }
            }});
        var pane = container.up('[ajxpClass="InfoPanel"]');
        NotificationLoader.IPANEL_FETCHPANE._rootNode.observe("loaded", function(){
            if(!mainContainer.hasClassName("infopanel_loading_finished")){
                mainContainer.addClassName("infopanel_loading_finished");
            }
            if(pane && pane.ajxpPaneObject){
                window.setTimeout(function(){
                    pane.ajxpPaneObject.resize();
                },0.2);
            }
            if(container.down('#ajxp_activity_panel > div.panelHeader')){
                if(!NotificationLoader.IPANEL_FETCHPANE._rootNode.getChildren().size){
                    container.down('#ajxp_activity_panel > div.panelHeader').hide();
                }else{
                    container.down('#ajxp_activity_panel > div.panelHeader').show();
                }
            }
        });
        // fRp.showElement(true);
        NotificationLoader.prototype.loaderTimer = window.setTimeout(function(){
            NotificationLoader.IPANEL_FETCHPANE.showElement(true);
        }, 0.5);

    },

    loaderTimer: null

});

NotificationLoader.getInstance = function(){
    if(!window.ajaxplorer.NotificationLoaderInstance){
        window.ajaxplorer.NotificationLoaderInstance = new NotificationLoader();
    }
    return window.ajaxplorer.NotificationLoaderInstance;
};