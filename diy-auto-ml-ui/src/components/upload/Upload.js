import React, { Component } from 'react';
import * as firebase from 'firebase'
import { Modal, Header, Form, Icon, Button, Input, Label } from 'semantic-ui-react'
import { db, storage } from '../fire';

export class Upload extends Component {
    state = {
        uploading: false,
        file: undefined,
        wrongType: false,
        tooLarge: false,
        fileName: "",
        name: `dataset-${db.collection("datasets").doc().id}`,
        user: this.props.user,
        open: false,
    }

    componentDidUpdate(prevProps) {
        if (this.props.user !== prevProps.user) {
            this.setState({
                user: this.props.user
            })
        }
        if (this.props.open !== prevProps.open) {
            this.setState({
                open: this.props.open
            })
        }
    }


    nameChange = (e) => {
        console.log(e.target.value)
        this.setState({
            name: e.target.value.slice(0, 32)
        })
      };

    fileChange = (e) => {
        console.log(e.target.files)
        if (e.target.files[0] && e.target.files[0].name) {
            let wrongType = e.target.files[0].type !== "text/csv"
            let tooLarge = e.target.files[0].size > 1073741824
            this.setState({
                fileName: e.target.files[0].name, 
                file: e.target.files[0],
                wrongType: wrongType,
                tooLarge: tooLarge
            })  
        } else {
            this.setState({
                fileName: "",
                file: undefined,
                wrongType: false,
                tooLarge: false,
            }) 
        }
      };

    handle_upload = () => {
        this.setState({
            uploading: true
        })
        var storageRef = storage.ref();
        const docRef = db.collection("datasets").doc()

        var metadata = {
            contentType: 'text/csv',
            customMetadata: {
                'owner': this.state.user.email,
                'name': this.state.name,
                'id': docRef.id
              }
        };

        // Upload file and metadata to the object 'images/mountains.jpg'
        var uploadTask = storageRef.child(`${docRef.id}.csv`).put(this.state.file, metadata);
        
        // Listen for state changes, errors, and completion of the upload.
        uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
        (snapshot) => {
            // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
            var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            switch (snapshot.state) {
            case firebase.storage.TaskState.PAUSED: // or 'paused'
                console.log(progress)
                break;
            case firebase.storage.TaskState.RUNNING: // or 'running'
                console.log(progress)
                break;
            }
        }, (error) => {
            switch (error.code) {
                case 'storage/unauthorized':
                // User doesn't have permission to access the object
                break;
                case 'storage/canceled':
                // User canceled the upload
                break;
                case 'storage/unknown':
                // Unknown error occurred, inspect error.serverResponse
                break;
            }
            this.setState({
                uploading: false
            }) 
        }, () => {
            this.setState({
                fileName: "",
                name: `dataset-${db.collection("datasets").doc().id}`,
                file: undefined,
                wrongType: false,
                tooLarge: false,
                uploading: false
            })
            this.props.close()
        });
    }

    render_large_label() {
        if (this.state.tooLarge) {
            return (
                <Label basic color='red' pointing>
                    File large than 1GB
                </Label>
            )
        }
    }

    render_type_label() {
        if (this.state.wrongType) {
            return (
                <Label basic color='red' pointing>
                    File is not text/csv
                </Label>
            )
        }
    }

    render() {
        return (
            <Modal size={"tiny"} centered open={this.state.open} closeIcon onClose={this.props.close}>
                <Header icon='plus' content='Add Dataset' />
                <Modal.Content>
                    <p>
                        Upload a dataset for model training
                    </p>
                    <Form loading={this.state.uploading}>
                        <Form.Input placeholder={"Dataset Name"} value={this.state.name} onChange={this.nameChange}/>
                        <Form.Field>
                            <label>Dataset upload </label>
                            <input
                                type="file"
                                id="file"
                                hidden
                                onChange={this.fileChange}
                            />
                            <Input
                                fluid
                                error={this.state.wrongType || this.state.tooLarge}
                                placeholder="Select dataset to upload"
                                readOnly
                                loading={this.state.uploading}
                                value={this.state.fileName}
                                action={
                                    <Button as="label" htmlFor="file" type="button" animated="fade">
                                        <Button.Content visible>
                                            <Icon name="file" />
                                        </Button.Content>
                                        <Button.Content hidden>Select</Button.Content>
                                    </Button>
                                }
                                />
                            {this.render_type_label()}
                            {this.render_large_label()}
                        </Form.Field>
                    </Form>
                </Modal.Content>
                <Modal.Actions>
                    <Button disabled={this.state.uploading} color='red' onClick={this.props.close} >
                        <Icon name='remove' /> Cancel
                    </Button>
                    <Button onClick={this.handle_upload} loading={this.state.uploading} positive disabled={(this.state.fileName === "") || (this.state.name.length < 3) || this.state.tooLarge || this.state.wrongType}>
                        Upload
                    </Button>
                </Modal.Actions>
            </Modal>
                    
        )
    }
}

export default Upload;