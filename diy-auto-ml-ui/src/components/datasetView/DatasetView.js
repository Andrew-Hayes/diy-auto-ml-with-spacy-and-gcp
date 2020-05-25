import React, { Component } from 'react';
import { Dimmer, Loader, Icon, Menu, Table, Progress, Button, Message, Container, Segment, Header, Divider, Label, Form, TextArea, Popup } from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import { db, functions } from '../fire';
import MainLayout from '../mainLayout/MainLayout'
import ModelStats from '../modelStats/ModelStats'
import history from '../../utils/history'


export class DatasetView extends Component {
    state = {
        user: this.props.user,
        activeItem: 'datasets',
        dataset: {},
        datasetID: "",
        activeMenu: "train",
        classify_text: "",
        classifying: false,
        classify_result: "",
        loading: true,
        training: false,
    };

    componentDidMount() {
        if (this.props.user && this.props.match.params.datasetID && this.props.match.params.datasetID !== "") {
            this.setState({
                user: this.props.user,
                datasetID: this.props.match.params.datasetID
            })
            const datasetRef = db.collection("datasets").doc(this.props.match.params.datasetID)
            this.unsubscribeDataset = datasetRef.onSnapshot(this.on_dataset_update);
        }
        if (this.props.match.params.datasetMenu && this.props.match.params.datasetMenu !== "") {
            this.setState({
                activeMenu: this.props.match.params.datasetMenu
            })
        }
    }

    componentWillUnmount() {
        if (this.unsubscribeDataset) {
            this.unsubscribeDataset()
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.user !== prevProps.user || this.props.match.params.datasetID !== prevProps.match.params.datasetID) {
            if (this.unsubscribeUserRef) {
                this.unsubscribeUserRef();
            }
            if (this.unsubscribeDatasets) {
                this.unsubscribeDataset()
            }
            if (this.props.user && this.props.match.params.datasetID && this.props.match.params.datasetID !== "") {
                const datasetRef = db.collection("datasets").doc(this.props.match.params.datasetID)
                this.unsubscribeDataset = datasetRef.onSnapshot(this.on_dataset_update);
            }

            this.setState({
                user: this.props.user,
                datasetID: this.props.match.params.datasetID
            })
        }
        if (this.props.match.params.datasetMenu !== prevProps.match.params.datasetMenu) {
            this.setState({
                activeMenu: this.props.match.params.datasetMenu
            })
        }
    }

    on_dataset_update = (snapshot) => {
        const datasetData = snapshot.data()
        const dataset = {
            id: snapshot.id,
            created_at: datasetData.created_at,
            last_update: datasetData.last_update,
            state: datasetData.state,
            name: datasetData.name,
            entries: datasetData.entries,
            label_stats: datasetData.label_stats || {},
            model_stats: datasetData.model_stats || {},
            model_url: datasetData.model_url || "",
            model_name: datasetData.model_name || "",
            model_id: datasetData.model_id || "",
            message: datasetData.message || "",
        }
        let training = false;
        if (dataset.state === "TRAINING") {
            training = true
        }
        this.setState({
            dataset: dataset,
            loading: false,
            training: training
        })
    };

    text_change = (e) => {
        this.setState({
            classify_text: e.target.value
        })
    };

    train_model() {
        var train_model = functions.httpsCallable('train_model');
        train_model({ datasetID: this.state.datasetID })
        .then(() => {
            
        }).catch((error) => {
            console.error(error)
        });
        this.setState({
            training: true
        })
    }

    classify_text() {
        var classify_text_func = functions.httpsCallable('test_model');
        classify_text_func({ modelURL: this.state.dataset.model_url, text: this.state.classify_text }).then((result) => {
            // Read result of the Cloud Function.
            this.setState({
                classifying: false,
                classify_result: result.data,
                classify_text: ""
            })
        }).catch((error) => {
            console.error(error)
            this.setState({
                classifying: false,
                classify_result: ""
            })
        });
        this.setState({
            classifying: true
        })
    }

    render_button() {
        if (this.state.dataset.state === "MODEL_READY") {
            return (
                <Button primary content={"Test Model"} onClick={() => { history.push(`/dataset/${this.state.datasetID}/test`) }} />
            )
        } else {
            return (
                <Button loading={this.state.training} disabled={this.state.training} primary content={"Train Model"} onClick={() => { this.train_model() }} />
            )
        }

    }

    render_no_model_button() {
        return (
            <Container textAlign={'center'} style={{ width: '300px', paddingTop: '10vh' }}>
                <Segment padded>
                    <Header as="h3">{!this.state.training ? ("No model trained.. yet...") : ("Training model now, please wait")}</Header>
                    <Divider />
                    <Button primary content={"Go to training"} onClick={() => { history.push(`/dataset/${this.state.datasetID}/train`) }} />
                </Segment>
            </Container>

        )
    }

    render_test() {
        if (Object.keys(this.state.dataset).length > 0 && this.state.dataset.model_url !== "") {
            return (
                <div style={{ marginLeft: "10px" }}>
                    <Header as='h2'>Model: <Link onClick={() => { history.push(`/model/${this.state.dataset.model_id}`) }}>{this.state.dataset.model_name}</Link></Header>
                    <Form>
                        <TextArea value={this.state.classify_text} onChange={this.text_change} style={{ maxWidth: "50%" }} rows={6} placeholder='Text to classify' />
                        <br /><br />
                        <Button loading={this.state.classifying} disabled={this.state.classifying} style={{ maxHeight: "33px" }} primary onClick={() => this.classify_text()}>
                            Classify
                        </Button> 
                        <span>The first time you run this can take a while.</span>
                        <Divider />

                        <Message attached content={"Result"} style={{ maxWidth: "50%" }} />
                        <Message attached style={{ maxWidth: "50%", minHeight: "120px" }}>
                            {this.state.classify_result}
                        </Message>

                    </Form>
                </div>
            )
        } else {
            return this.render_no_model_button()
        }
    }

    render_evaluation() {
        if (this.state.dataset.model_stats && Object.keys(this.state.dataset.model_stats).length > 0) {
            return (
                <div style={{ marginLeft: "10px" }}>
                    <Header as='h2'>Model: <Link onClick={() => { history.push(`/model/${this.state.dataset.model_id}`) }}>{this.state.dataset.model_name}</Link></Header>
                    <span>
                        We created a model from your dataset and this is how well it performed
                    </span>
                    <br /><br />
                    <ModelStats 
                        created_at={this.state.dataset.created_at} 
                        entries={this.state.dataset.entries} 
                        recall={this.state.dataset.model_stats.recall}
                        predict={this.state.dataset.model_stats.predict}
                        fvalue={this.state.dataset.model_stats.fvalue}/>
                    <Button primary content={"Test Model"} onClick={() => { history.push(`/dataset/${this.state.datasetID}/test`) }} />
                </div>
            )
        } else {
            return this.render_no_model_button()
        }
    }

    render_stats_table() {
        if (this.state.dataset !== {}) {
            const cells = Object.keys(this.state.dataset.label_stats).map((label) => {
                return (
                    <Table.Row key={label}>
                        <Table.Cell collapsing>{label}</Table.Cell>
                        <Table.Cell><Progress style={{ marginBottom: "0px" }} color='blue' progress='value' value={this.state.dataset.label_stats[label]} total={this.state.dataset.entries} /></Table.Cell>
                        <Table.Cell collapsing>{Math.round(this.state.dataset.label_stats[label] * 0.8)}</Table.Cell>
                        <Table.Cell collapsing>{Math.round(this.state.dataset.label_stats[label] * 0.2)}</Table.Cell>
                    </Table.Row>
                )
            })
            return (
                <Table celled>
                    <Table.Header>
                        <Table.Row>
                            <Table.HeaderCell>Label</Table.HeaderCell>
                            <Table.HeaderCell>Annotations</Table.HeaderCell>
                            <Table.HeaderCell>Train</Table.HeaderCell>
                            <Table.HeaderCell>Test</Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {cells}
                    </Table.Body>
                </Table>
            )
        }
    }

    render_menu_body() {
        if (this.state.activeMenu === "evaluate") {
            return (
                <span>
                    {this.render_evaluation()}
                </span>
            )
        } else if (this.state.activeMenu === "test") {
            return (
                <span>
                    {this.render_test()}
                </span>
            )
        } else {
            return (
                <span>
                    Your data set will be split automatically into Train and Test sets.
                    <br /> <br />
                    Ideally, each label should have at least 100 items assigned to it. Ensure that your model is trained to predict equally well for each label.
                    <br /> <br />
                    {this.render_stats_table()}
                    <br />
                    {this.render_button()}
                </span>
            )
        }
    }

    render_content() {
        if (!this.state.user || this.state.loading) {
            return (
                <Dimmer inverted active>
                    <Loader >Loading Dataset..</Loader>
                </Dimmer>
            )
        }
        else {
            return (
                <div>
                    <Menu pointing secondary color={"blue"}>
                        <Menu.Item
                            name='Train'
                            active={this.state.activeMenu === "train"}
                            onClick={() => { history.push(`/dataset/${this.state.datasetID}/train`) }}
                        />
                        <Menu.Item
                            name='Evaluate'
                            active={this.state.activeMenu === "evaluate"}
                            onClick={() => { history.push(`/dataset/${this.state.datasetID}/evaluate`) }}
                        />
                        <Menu.Item
                            name='Test'
                            active={this.state.activeMenu === "test"}
                            onClick={() => { history.push(`/dataset/${this.state.datasetID}/test`) }}
                        />
                    </Menu>
                    {this.render_menu_body()}
                </div>
            )
        }
    }

    nav_back = () => {
        history.push("/datasets")
    }

    render_submenu() {
        return (
            <Menu.Item>
                <Icon link size={"large"} name='angle left' color={"blue"} onClick={() => { this.nav_back() }} />
                {this.state.dataset.name}
                {this.state.dataset.state === "TRAINING" ? (<Label color={"olive"}>Training Model <Loader style={{ marginLeft: "8px" }} size={"tiny"} active inline /></Label>) : ("")}
                {this.state.dataset.state === "ERROR" ? (<Popup position={"bottom left"} content={this.state.dataset.message} trigger={<Label color={"red"}>Error</Label>}/>) : ("")}
            </Menu.Item>
        )
    }

    render() {
        return (
            <MainLayout
                viewName={"datasets"}
                user={this.state.user}
                subMenu={this.render_submenu()}
                log_out={this.props.log_out}>
                {this.render_content()}
            </MainLayout>
        );
    }
}

export default DatasetView;
