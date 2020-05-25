import React, { Component } from 'react';
import './App.css';
import LoggedInRoute from './routers/LoggedInRoute';
import history from '../utils/history';
import Login from './auth/Login';
import DatasetsView from './datasetsView/DatasetsView';
import DatasetView from './datasetView/DatasetView';
import ModelView from './modelView/ModelView';
import ModelsView from './modelsView/ModelsView';
import { Route, Router, Switch, Redirect } from 'react-router-dom';
import { auth } from './fire';
export class App extends Component {
    state = {
        background: this.props.background,
        loggedIn: false,
        loggingIn: false,
        user: null,
    };

    update_login_status(userLoggedIn) {
        this.setState({
            loggedIn: userLoggedIn
        })
    }

    update_logging_in(userLoggingIn) {
        this.setState({
            loggingIn: userLoggingIn
        })
    }

    componentDidMount() {
        this.authSubscription = auth.onAuthStateChanged((user) => {
            if (user) {
                this.update_login_status(true);
            } else {
                this.update_login_status(false);
            }
            this.setState({
                    user: user
                })
            this.update_logging_in(false);
        });
    }

    componentWillUnmount() {
        if (this.authSubscription) {
            this.authSubscription();
        }
    }

    render() {
        document.title = 'DIY AutoML NLP';
        return (
            <main>
                <Router history={history}>
                    <Switch>
                        <Route path="/login" exact render={(props) => <Login {...props} update_logging_in={this.update_logging_in.bind(this)} loggingIn={this.state.loggingIn} loggedIn={this.state.loggedIn} />} />
                        <Route path="/" exact render={props => (
                            <Redirect to={{ pathname: '/datasets' }} />
                        )} />
                        <LoggedInRoute authStatus={this.state.loggedIn} user={this.state.user} path="/dataset/:datasetID/:datasetMenu" component={DatasetView} />
                        <Route path="/dataset/:datasetID" exact render={props => (
                            <Redirect to={{ pathname: `/dataset/${props.match.params.datasetID}/train` }} />
                        )} />
                        <LoggedInRoute authStatus={this.state.loggedIn} user={this.state.user} exact path="/datasets" component={DatasetsView} />
                        <LoggedInRoute authStatus={this.state.loggedIn} user={this.state.user} path="/model/:modelID" component={ModelView} />
                        <LoggedInRoute authStatus={this.state.loggedIn} user={this.state.user} exact path="/models" component={ModelsView} />
                    </Switch>
                </Router>
            </main>
        );
    }
}

export default (App);
