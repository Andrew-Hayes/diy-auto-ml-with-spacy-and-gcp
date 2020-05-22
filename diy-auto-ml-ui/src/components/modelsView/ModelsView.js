import React, { Component } from 'react';
import { Dimmer, Loader, Button, Menu } from 'semantic-ui-react';
import { db } from '../fire';
import MainLayout from '../mainLayout/MainLayout'
import history from '../../utils/history'

export class ModelsView extends Component {
    state = {
        user: this.props.user,
        activeItem: 'models',
        models: [],
        loading: true
    };

    componentDidMount() {
        if (this.props.user) {
            this.setState({
                user: this.props.user
            })
            const modelsRef = db.collection("models").where("owner", "==", this.state.user.email).orderBy("last_update", "desc");
            this.unsubscribeModels = modelsRef.onSnapshot(this.on_models_update);
        }
        
    }

    componentWillUnmount() {
        if (this.unsubscribeUserRef) {
            this.unsubscribeUserRef();
        }
        if (this.unsubscribeModels) {
            this.unsubscribeModels()
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.user !== prevProps.user) {
            
            if (this.unsubscribeUserRef) {
                this.unsubscribeUserRef();
            }
            if (this.unsubscribeModels) {
                this.unsubscribeModels()
            }
            if (this.props.user) {
                const modelsRef = db.collection("models").where("owner", "==", this.props.user.email).orderBy("last_update", "desc");
                this.unsubscribeModels = modelsRef.onSnapshot(this.on_models_update);
            }
            
            this.setState({
                user: this.props.user
            })
        }
    }

    on_models_update = (snapshot) => {
        const models = snapshot.docs.map(docSnapshot => {
          const docData = docSnapshot.data();
          return ({
            id: docSnapshot.id
          })
        });
        this.setState({
            models: models,
            loading: false,
        })
      };


    render_content() {
        if (!this.state.user || this.state.loading) {
            return (
                <Dimmer inverted active>
                    <Loader >Loading Models..</Loader>
                </Dimmer>
            )
        }
        else {
            return (
                <span style={{padding: "20px"}}>
                    No models trained yet....
                    <br/><br />
                    <Button primary onClick={() => {history.push("/datasets")}} content={"Go to Datasets"} />
                </span>
            )
        }
    }

    render_submenu() {
        return (
            <Menu.Item>
                <span style={{paddingRight: "20px"}}><strong>{"Models"}</strong></span>
            </Menu.Item>
        )
    }

    render() {
        return (
            <MainLayout 
                viewName={"models"} 
                user={this.state.user} 
                log_out={this.props.log_out} 
                subMenu={this.render_submenu()}>
                {this.render_content()}
            </MainLayout>
        );
    }
}

export default ModelsView;
