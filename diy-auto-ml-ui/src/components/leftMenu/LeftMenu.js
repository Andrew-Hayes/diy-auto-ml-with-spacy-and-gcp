import React, { Component } from 'react';
import { Menu } from 'semantic-ui-react';
import history from '../../utils/history'

export class LeftMenu extends Component {
    state = {
        activeItem: this.props.activeItem
    };

    componentDidUpdate(prevProps) {
        if (this.props.activeItem !== prevProps.activeItem) {
            this.setState({activeItem: this.props.activeItem})
        }
    }

    handleItemClick = (e, { name }) => {
        history.push(`/${name}`)
    }

    render() {
        const { activeItem } = this.state;
        return (
            <Menu fluid vertical tabular color={"blue"} style={{ minHeight: "100vh"}}>
                <Menu.Item>
                    <Menu.Menu>
                        <Menu.Item
                            name='datasets'
                            active={activeItem.indexOf('dataset') > -1}
                            onClick={this.handleItemClick}
                            icon={"list ul"}
                        />
                        <Menu.Item
                            name='models'
                            active={activeItem.indexOf('model') > -1}
                            onClick={this.handleItemClick}
                            icon={"lightbulb"}
                        />
                    </Menu.Menu>
                </Menu.Item>
            </Menu>
        )
    }
}

export default LeftMenu;