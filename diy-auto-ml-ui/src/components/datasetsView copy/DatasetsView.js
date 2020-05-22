import React, { Component } from 'react';
import { Table, Dimmer, Loader, Label, Popup, Button, Icon, Menu } from 'semantic-ui-react';
import { db } from '../fire';
import Upload from '../upload/Upload'
import MainLayout from '../mainLayout/MainLayout'
import {epoch_to_local} from '../../utils/helpers'
import history from '../../utils/history'
import { Link } from 'react-router-dom';

export class DatasetsView extends Component {
    state = {
        user: this.props.user,
        activeItem: 'datasets',
        addDatasetModal: false,
        datasets: [],
        loading: true
    };

    componentDidMount() {
        if (this.props.user) {
            console.log(this.props.user.email)
            this.setState({
                user: this.props.user
            })
            const datasetRef = db.collection("datasets").where("owner", "==", this.state.user.email).orderBy("last_update", "desc");
            this.unsubscribeDatasets = datasetRef.onSnapshot(this.on_datasets_update);
        }
        
    }

    componentWillUnmount() {
        if (this.unsubscribeUserRef) {
            this.unsubscribeUserRef();
        }
        if (this.unsubscribeDatasets) {
            this.unsubscribeDatasets()
        }
    }

    componentDidUpdate(prevProps) {
        // Typical usage (don't forget to compare props):
        console.log("did update user")
        console.log(this.props.user)
        if (this.props.user !== prevProps.user) {
            
            if (this.unsubscribeUserRef) {
                this.unsubscribeUserRef();
            }
            if (this.unsubscribeDatasets) {
                this.unsubscribeDatasets()
            }
            if (this.props.user) {
                console.log(this.props.user)
                console.log(this.props.user.email)
                const datasetRef = db.collection("datasets").where("owner", "==", this.props.user.email).orderBy("last_update", "desc");
                this.unsubscribeDatasets = datasetRef.onSnapshot(this.on_datasets_update);
            }
            
            this.setState({
                user: this.props.user
            })
        }
    }

    on_datasets_update = (snapshot) => {
        const datasets = snapshot.docs.map(docSnapshot => {
          const docData = docSnapshot.data();
          const label_count = Object.keys(docData.label_stats).length
          return ({
            id: docSnapshot.id,
            created_at: docData.created_at,
            last_update: docData.last_update,
            state: docData.state,
            name: docData.name,
            entries: docData.entries,
            label_count: label_count,
            message: docData.message || "",
          })
        });
        this.setState({
            datasets: datasets,
            loading: false,
        })
      };

    add_dataset() {
        this.setState({
            addDatasetModal: true
        })
    };

    close_add_dataset() {
        this.setState({
            addDatasetModal: false
        })
    };

    render_state(state, message) {
        if (state === "AWAITING_ANALYSIS") {
           return (<Table.Cell><Label color={"yellow"} content={state} /></Table.Cell>)        
        } else if (state === "READY_FOR_TRAINING") {
            return (<Table.Cell><Label color={"blue"} content={state} /></Table.Cell>)     
        } else if (state === "ERROR") {
            return (<Table.Cell><Popup position={"bottom left"} content={message} trigger={<Label color={"red"} content={state} />} /></Table.Cell>)     
        } else {
            return (<Table.Cell><Label content={state} /></Table.Cell>) 
        }
    }

    render_table_rows() {
        return this.state.datasets.map((dataset) => {
            return(
                <Table.Row key={dataset.id}>
                    <Table.Cell><Link onClick={() => {history.push(`dataset/${dataset.id}`)}}>{dataset.name}</Link></Table.Cell>
                    {this.render_state(dataset.state, dataset.message)}
                    <Table.Cell>{dataset.entries}</Table.Cell>
                    <Table.Cell>{dataset.label_count}</Table.Cell>
                    <Table.Cell>{epoch_to_local(dataset.last_update)}</Table.Cell>
                    <Table.Cell>{epoch_to_local(dataset.created_at)}</Table.Cell>
                    <Table.Cell style={{maxWidth: "20px"}}>
                        <Popup position={"bottom right"} flowing hoverable trigger={<Icon name="ellipsis vertical" />}>
                            <Button color={"red"}>Delete</Button>
                        </Popup>
                    </Table.Cell>
                </Table.Row>
            )
        })
    }

    render_footer() {
        if (this.state.datasets.length < 1) {
            return (
                <Table.Row>
                    <Table.HeaderCell colSpan='6'>
                        <Label content={"No datasets found"} />
                    </Table.HeaderCell>
                </Table.Row>
            )
        }
    }

    render_table() {
        return (
            <Table celled>
                <Table.Header>
                <Table.Row>
                    <Table.HeaderCell>Name</Table.HeaderCell>
                    <Table.HeaderCell>Status</Table.HeaderCell>
                    <Table.HeaderCell>Entries</Table.HeaderCell>
                    <Table.HeaderCell># of Labels</Table.HeaderCell>
                    <Table.HeaderCell>Last Update</Table.HeaderCell>
                    <Table.HeaderCell>Created at</Table.HeaderCell>
                    <Table.HeaderCell></Table.HeaderCell>
                </Table.Row>
                </Table.Header>

                <Table.Body>
                    {this.render_table_rows()}
                </Table.Body>

                <Table.Footer>
                    {this.render_footer()}
                </Table.Footer> 
            </Table>
        )
    }

    render_content() {
        if (!this.state.user || this.state.loading) {
            return (
                <Dimmer active>
                    <Loader >Loading..</Loader>
                </Dimmer>
            )
        }
        else {
            return (
                <span>
                    {this.render_table()}
                    <Upload open={this.state.addDatasetModal} close={this.close_add_dataset.bind(this)} user={this.state.authUser}/>
                </span>
            )
        }
    }

    render_submenu() {
        return (
        <Menu.Item>
            <Button primary content='Add Dataset' icon='plus' labelPosition='right' onClick={this.add_dataset.bind(this)} />
        </Menu.Item>
        )
    }

    render() {
        return (
            <MainLayout 
                viewName={"datasets"} 
                user={this.state.user} 
                log_out={this.props.log_out} 
                subMenu={this.render_submenu()}>
                {this.render_content()}
            </MainLayout>
        );
    }
}

export default DatasetsView;
