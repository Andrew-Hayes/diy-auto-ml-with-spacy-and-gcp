import React, { Component } from 'react'
import { Dropdown, Icon, Menu, Card, Button } from 'semantic-ui-react'
import history from '../../utils/history';
import {auth} from '../fire'


class AppMenu extends Component {
    constructor(props) {
        super(props);
        this.state = {
            user: this.props.user,
            datasetButton: this.props.datasetButton,
            subMenu: this.props.subMenu
        }
        this.mobileMaxWidth = "459";
        this.desktopMinWidth = "460";
    }

    componentDidUpdate(prevProps) {
        // Typical usage (don't forget to compare props):
        if (this.props.user !== prevProps.user) {
            this.setState({
                user: this.props.user
            })
        }
        if (this.props.datasetButton !== prevProps.datasetButton) {
            this.setState({
                user: this.props.datasetButton
            })
        }
        if (this.props.subMenu !== prevProps.subMenu) {
            this.setState({
                subMenu: this.props.subMenu
            })
        }
    }

    log_out = () => {
        auth.signOut();
    };

    render_user_content() {
        const user = this.state.user;
        return (
            <Dropdown.Menu>
            <Card>
                <Card.Content>
                    <Card.Header>
                        {user.email}
                    </Card.Header>
                </Card.Content>
                <Card.Content>
                    <Button onClick={() => {this.log_out()}} color='blue'>Sign Out&nbsp;&nbsp;<Icon name={'sign out'} /></Button>
                    &nbsp;
                </Card.Content>
            </Card>
        </Dropdown.Menu>
        )
    }

    render_user_menu() {
        const user = this.state.user;
        if (user) {
            return (
                <Dropdown item icon={"user"} simple>
                    {this.render_user_content()}
                </Dropdown>
            )
        } else {
            return (
                <Menu.Item onClick={() => {history.push('/login');}}>
                    Log in
                </Menu.Item>
            )
        }
    }

    render_sub_menu() {
        if (this.state.subMenu) {
            return this.state.subMenu
        }
    }


    render_menu() {
        return (
            <Menu attached='top' secondary
                style={{textAlign: "center", width: '100%', height: "100%", borderWidth: '0px' }}>
                {this.render_sub_menu()}
                <Menu.Menu position='right'>
                    {this.render_user_menu()}
                </Menu.Menu>
            </Menu>
        )
    }

    render() {
        return (
            <div>
                {this.render_menu()}
            </div>
        );
    }
}

export default AppMenu;
