/*
 * Copyright 2007-2017 Charles du Jeu - Abstrium SAS <team (at) pyd.io>
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

const React = require('react')
const {AsyncComponent} = require('pydio/http/resources-manager').requireLib('boot')
const {UserAvatar, IconButtonMenu, Toolbar} = require('pydio/http/resources-manager').requireLib('components')
const {IconButton, Paper} = require('material-ui')

export default React.createClass({

    propTypes:{
        pydio: React.PropTypes.instanceOf(Pydio),
        style: React.PropTypes.object,
        avatarStyle: React.PropTypes.object,
        actionBarStyle: React.PropTypes.object
    },

    applyAction: function(actionName){
        switch (actionName){
            case 'home':
                this.props.pydio.triggerRepositoryChange('ajxp_home');
                break;
            case 'settings':
                this.props.pydio.triggerRepositoryChange('ajxp_conf');
                break;
            default:
                break;
        }
    },

    render: function() {

        const messages = this.props.pydio.MessageHash;

        let avatar;
        let homeButton, infoButton, logoutButton, notificationsButton, settingsButton, currentIsSettings;
        let avatarStyle = this.props.avatarStyle || {};
        if(this.props.pydio.user){
            const user = this.props.pydio.user;
            currentIsSettings = user.activeRepository === 'ajxp_conf';
            avatar = (
                <UserAvatar
                    pydio={this.props.pydio}
                    userId={user.id}
                    style={avatarStyle}
                    className="user-display"
                    labelClassName="userLabel"
                    labelStyle={{flex: 1, marginLeft: 5}}
                >
                    <IconButtonMenu
                        {...this.props}
                        buttonClassName={'mdi mdi-dots-vertical'}
                        buttonStyle={{color: 'white'}}
                        buttonTitle={messages['165']}
                        toolbars={["user", "zlogin"]}
                        controller={this.props.pydio.Controller}
                        popoverDirection={"left"}
                        popoverTargetPosition={"top"}
                        menuProps={{display:'right', width:160, desktop:true}}
                    />
                </UserAvatar>
            );

            if(user.getRepositoriesList().has('ajxp_home') && user.activeRepository !== 'ajxp_home'){
                homeButton = (
                    <IconButton
                        onTouchTap={this.applyAction.bind(this, 'home')}
                        iconClassName="userActionIcon mdi mdi-home-variant"
                        className="userActionButton backToHomeButton"
                        tooltip={messages['305']}
                        tooltipPosition="bottom-left"
                    />
                );
            }
            if(this.props.pydio.Controller.getActionByName('get_my_feed') && !this.props.hideNotifications && !(this.props.pydio.user && this.props.pydio.user.activeRepository === 'inbox')){
                notificationsButton = (
                    <AsyncComponent
                        namespace="PydioNotifications"
                        componentName="Panel"
                        noLoader={true}
                        iconClassName="userActionIcon mdi mdi-bell-outline"
                        {...this.props}
                    />
                );
            }
        }

        // Do not display Home Button here for the moment
        const actionBarStyle = this.props.actionBarStyle || {};
        let actionBar;
        if(currentIsSettings){
            actionBar = (
                <div className="action_bar" style={{display:'flex', ...actionBarStyle}}>
                    {homeButton}
                </div>
            );
        }else{
            actionBar = (
                <div className="action_bar" style={{display:'flex', ...actionBarStyle}}>
                    <Toolbar
                        {...this.props}
                        toolbars={['user-widget']}
                        renderingType="icon"
                        toolbarStyle={{display:'inline'}}
                        buttonStyle={{color: 'rgba(255,255,255,255.93)', fontSize: 18}}
                        tooltipPosition="bottom-right"
                        className="user-widget-toolbar"
                    />
                    {notificationsButton}
                    {settingsButton}
                    <span style={{flex:1}}/>
                    {homeButton}
                </div>
            );

        }

        if(this.props.children){
            return (
                <Paper zDepth={1} rounded={false} style={{...this.props.style, display:'flex'}} className="user-widget primaryColorDarkerPaper">
                    <div style={{flex: 1}}>
                        {avatar}
                        {actionBar}
                    </div>
                    {this.props.children}
                </Paper>
            );
        }else{
            return (
                <Paper zDepth={1} rounded={false} style={this.props.style} className="user-widget primaryColorDarkerPaper">
                    {avatar}
                    {actionBar}
                </Paper>
            );
        }
    }
});
