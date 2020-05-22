import React, { Component } from 'react';
import { Container, Header, Form, Segment, Divider } from 'semantic-ui-react';
import firebase from 'firebase';
import { Redirect } from 'react-router-dom';

export class Login extends Component {
    state = {
        loggingIn: false,
        email: "",
        password: "",
        loggedIn: this.props.loggedIn,
    }

    componentDidUpdate(prevProps) {
        if (this.props.loggedIn !== prevProps.loggedIn) {
            this.setState({
                loggedIn: this.props.loggedIn,
            });
        }
    }

    handle_login = () => {
        this.setState({
            loggingIn: true,
        })
        firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password).then(() => {
            this.setState({
                loggingIn: false,
            });
        }).catch((error) => {
            this.setState({
                loggingIn: false,
            })
        });
    }

    handle_email_change = (e, { value }) => {
        this.setState({
            email: value,
        })
    }

    handle_password_change = (e, { value }) => {
        this.setState({
            password: value,
        })
    }

    render() {
        if (this.props.loggedIn) {
            const { from } = this.props.location.state || { from: { pathname: '/datasets' } };
            return (
                <Redirect to={from} />
            );
        }
        return (
            <Container textAlign={'center'} style={{ width: '300px', paddingTop: '10vh' }}>
                <Segment padded>
                    <Header as="h1">Welcome to <br/> DIY AutoML NLP </Header>
                    <Divider />
                    <Form loading={this.state.loggingIn} onSubmit={this.handle_login}>
                        <Form.Input required
                            fluid
                            label='Email'
                            placeholder='Email Address'
                            onChange={this.handle_email_change}
                            value={this.state.email}
                            maxLength='75' />
                        <Form.Input required
                            fluid
                            type={"password"}
                            label='Password'
                            value={this.state.password}
                            onChange={this.handle_password_change} maxLength='75' />
                        <Form.Button fluid positive>
                            Login
                        </Form.Button>
                    </Form>
                </Segment>
            </Container>
        );
    }
}

export default Login;
