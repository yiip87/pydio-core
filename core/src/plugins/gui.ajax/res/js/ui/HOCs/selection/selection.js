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

import React from 'react';
import { connect } from 'react-redux';
import { SelectionModel } from './';
import { getDisplayName } from '../utils';
import { mapStateToProps, Actions } from './utils';

const withSelection = (filter) => {
    return (Component) => {
        class WithSelection extends React.Component {
            static get displayName() {
                return `WithSelection(${getDisplayName(Component)})`
            }

            static get propTypes() {
                return {
                    node: React.PropTypes.instanceOf(AjxpNode).isRequired,
                    filter: React.PropTypes.func
                }
            }

            componentDidMount() {
                const {id, node, filter, tabModify} = this.props

                tabModify({
                    id,
                    selection: new SelectionModel(node, filter)
                })
            }

            render() {
                const {id, node, selection, playing, tabModify, ...remainingProps} = this.props

                return (
                    <Component
                        {...remainingProps}
                        node={node}
                        selectionPlaying={playing}
                        onRequestSelectionPlay={() => tabModify({id, node: selection.nextOrFirst(), title: selection.currentNode.getLabel()})}
                    />
                )
            }
        }

        return connect(mapStateToProps, Actions)(WithSelection)
    }
}

export default withSelection
