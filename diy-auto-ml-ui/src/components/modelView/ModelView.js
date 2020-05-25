import React, { Component } from 'react';
import { Dimmer, Loader, Icon, Menu, Button, Message,Header, Divider } from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import { db } from '../fire';
import MainLayout from '../mainLayout/MainLayout'
import ModelStats from '../modelStats/ModelStats'
import history from '../../utils/history'


export class ModelView extends Component {
    state = {
        user: this.props.user,
        activeItem: 'models',
        model: {},
        modelID: "",
        loading: true,
    };

    componentDidMount() {
        if (this.props.user && this.props.match.params.modelID && this.props.match.params.modelID !== "") {
            this.setState({
                user: this.props.user,
                modelID: this.props.match.params.modelID
            })
            const modelRef = db.collection("models").doc(this.props.match.params.modelID)
            this.unsubscribeModel = modelRef.onSnapshot(this.on_model_update);
        }
    }

    componentWillUnmount() {
        if (this.unsubscribeModel) {
            this.unsubscribeModel()
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.user !== prevProps.user || this.props.match.params.modelID !== prevProps.match.params.modelID) {
            if (this.unsubscribeUserRef) {
                this.unsubscribeUserRef();
            }
            if (this.unsubscribeModel) {
                this.unsubscribeModel()
            }
            if (this.props.user && this.props.match.params.modelID && this.props.match.params.modelID !== "") {
                const modelRef = db.collection("models").doc(this.props.match.params.modelID)
                this.unsubscribeModel = modelRef.onSnapshot(this.on_model_update);
            }

            this.setState({
                user: this.props.user,
                modelID: this.props.match.params.modelID
            })
        }
    }

    on_model_update = (snapshot) => {
        const modelData = snapshot.data()
        const model = {
            id: snapshot.id,
            created_at: modelData.created_at,
            last_update: modelData.last_update,
            model_name: modelData.model_name,
            dataset_doc: modelData.dataset_doc,
            dataset: modelData.dataset,
            entries: modelData.entries,
            model_stats: modelData.model_stats || {},
            model_url: modelData.model_url || "",
        }

        this.setState({
            model: model,
            loading: false,
        })
    };

    render_button() {
        return (
            <Button primary content={"Test Model"} onClick={() => { history.push(`/dataset/${this.state.model.dataset_doc}/test`) }} />
        )
    }

    render_evaluation() {
        if (this.state.model.model_stats && Object.keys(this.state.model.model_stats).length > 0) {
            return (
                <div style={{ marginLeft: "10px" }}>
                    <Header as='h2'>Model: {this.state.model.model_name}</Header>
                    <span>
                    We created this model from your dataset '<Link onClick={() => { history.push(`/dataset/${this.state.model.dataset_doc}`) }}>{this.state.model.dataset}</Link>' and this is how well it performed
                    </span>
                    <br /><br />
                    <ModelStats 
                        created_at={this.state.model.created_at} 
                        entries={this.state.model.entries} 
                        recall={this.state.model.model_stats.recall}
                        predict={this.state.model.model_stats.predict}
                        fvalue={this.state.model.model_stats.fvalue}/>
                    <br />
                    {this.render_button()}
                    <br />
                    <Divider/>
                    <Message attached content={"Use this model:"} style={{ maxWidth: "50%" }} />
                    <Message className={"code"} attached style={{ maxWidth: "50%", minHeight: "90px" }}>
                        {`curl -X POST -H 'Content-type: application/json' --data '{"payload":"Text to classify"}' ${this.state.model.model_url}/`}
                    </Message>
                </div>
            )
        } else {
            return this.render_no_model_button()
        }
    }

    render_content() {
        if (!this.state.user || this.state.loading) {
            return (
                <Dimmer inverted active>
                    <Loader >Loading Model..</Loader>
                </Dimmer>
            )
        }
        else {
            return (
                <span>
                    {this.render_evaluation()}
                </span>
            )
        }
    }

    nav_back = () => {
        history.push("/models")
    }

    render_submenu() {
        return (
            <Menu.Item>
                <Icon link size={"large"} name='angle left' color={"blue"} onClick={() => { this.nav_back() }} />
                {this.state.model.model_name}
            </Menu.Item>
        )
    }

    render() {
        return (
            <MainLayout
                viewName={"models"}
                user={this.state.user}
                subMenu={this.render_submenu()}
                log_out={this.props.log_out}>
                {this.render_content()}
            </MainLayout>
        );
    }
}

export default ModelView;
