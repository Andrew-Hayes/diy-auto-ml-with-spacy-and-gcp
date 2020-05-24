import React, { Component } from 'react';
import { Dimmer, Loader, Button, Menu, Segment, Container, Divider, Header, Table, Popup, Icon } from 'semantic-ui-react';
import { db } from '../fire';
import MainLayout from '../mainLayout/MainLayout'
import { Link } from 'react-router-dom';
import history from '../../utils/history'
import {epoch_to_local} from '../../utils/helpers'

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
            id: docSnapshot.id,
            created_at: docData.created_at,
            last_update: docData.last_update,
            dataset: docData.dataset || "",
            datasetDoc: docData.datasetDoc || "",
            model_stats: docData.model_stats || {},
            model_url: docData.model_url || "",
            name: docData.modelName || "",
          })
        });
        this.setState({
            models: models,
            loading: false,
        })
      };

    render_table_rows() {
        return this.state.models.map((model) => {
            return(
                <Table.Row key={model.id}>
                    <Table.Cell><Link onClick={() => {history.push(`/model/${model.id}`)}}>{model.name}</Link></Table.Cell>
                    <Table.Cell><Link onClick={() => {history.push(`/dataset/${model.datasetDoc}`)}}>{model.dataset}</Link></Table.Cell>
                    <Table.Cell>{model.model_stats.fvalue}</Table.Cell>
                    <Table.Cell>{model.model_stats.predict}</Table.Cell>
                    <Table.Cell>{model.model_stats.recall}</Table.Cell>
                    <Table.Cell>{epoch_to_local(model.created_at)}</Table.Cell>
                    <Table.Cell>{epoch_to_local(model.last_update)}</Table.Cell>
                    <Table.Cell style={{maxWidth: "20px"}}>
                        <Popup position={"bottom right"} flowing hoverable trigger={<Icon name="ellipsis vertical" />}>
                            <Button color={"red"}>Delete</Button>
                        </Popup>
                    </Table.Cell>
                </Table.Row>
            )
        })
    }

    render_models_table() {
        return (
            <Table celled>
                <Table.Header>
                    <Table.Row>
                        <Table.HeaderCell>Name</Table.HeaderCell>
                        <Table.HeaderCell>Dataset</Table.HeaderCell>
                        <Table.HeaderCell>Precision</Table.HeaderCell>
                        <Table.HeaderCell>Predict</Table.HeaderCell>
                        <Table.HeaderCell>Recall</Table.HeaderCell>
                        <Table.HeaderCell>Created at</Table.HeaderCell>
                        <Table.HeaderCell>Last Update</Table.HeaderCell>
                        <Table.HeaderCell></Table.HeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {this.render_table_rows()}
                </Table.Body>
            </Table>
        )
    }


    render_content() {
        if (!this.state.user || this.state.loading) {
            return (
                <Dimmer inverted active>
                    <Loader >Loading Models..</Loader>
                </Dimmer>
            )
        }
        else {
            if (this.state.models.length > 0) {
                return (this.render_models_table())
            } else {
                return (
                <Container textAlign={'center'} style={{ width: '300px', paddingTop: '10vh' }}>
                <Segment padded>
                    <Header as="h3">No models trained yet....</Header>
                    <Divider />
                    <Button primary onClick={() => {history.push("/datasets")}} content={"Go to Datasets"} />
                </Segment>
            </Container>
            )
            }
            
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
