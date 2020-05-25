import React, { Component } from 'react';
import { Modal, Header, Button, Input, Icon, Message, Dimmer, Loader } from 'semantic-ui-react';

export class DeleteModal extends Component {
    state = {
        open: this.props.open,
        itemName: this.props.itemName,
        itemID: this.props.itemID,
        message: this.props.message,
        deleting: false,
        badName: false,
        currentName: ""
    };

    componentDidUpdate(prevProps) {
        if (this.props.open !== prevProps.open) {
            this.setState({open: this.props.open})
        }
        if (this.props.message !== prevProps.message) {
            this.setState({message: this.props.message})
        }
        if (this.props.itemName !== prevProps.itemName) {
            this.setState({itemName: this.props.itemName})
        }
        if (this.props.itemID !== prevProps.itemID) {
            this.setState({itemID: this.props.itemID})
        }
    }

    handleDelete = () => {
        this.setState({deleting: true})
        const { itemID } = this.state;
        this.props.delete(itemID)
        .then(() => {
            this.handleClose()
        }).catch((err) => {
            console.error(err)

        })
    }

    handleClose = () => {
        this.setState({
            currentName: "",
            deleting: false
        })
        this.props.close()
    }

    text_change = (e) => {
        this.setState({
            currentName: e.target.value
        })
    };

    disable_delete() {
        const { currentName, itemName } = this.state;
        if(currentName.trim() === "" || currentName.trim() !== itemName.trim() || this.state.deleting) {
            return true
        } else {
            return false
        }
    }

    render() {
        const { open } = this.state;
        return (
            <Modal size={"tiny"} open={open}>
                <Header icon='delete' content={`Delete: ${this.state.itemName}?`} />
                <Modal.Content>
                <Dimmer>
                    <Loader active={this.state.deleting} />
                </Dimmer>
                <Message fluid negative>
                    {this.state.message}
                </Message>
                Enter the name '{this.state.itemName}' below to confirm the delete:<br/><br/>
                <Input fluid placeholder={this.state.itemName} value={this.state.currentName} onChange={this.text_change} />
                </Modal.Content>
                <Modal.Actions>
                <Button onClick={() => {this.handleClose()}}>
                    Cancel
                </Button>
                <Button loading={this.state.deleting} color='red' disabled={this.disable_delete()} onClick={() => {this.handleDelete()}}>
                    <Icon name='delete'/>Delete
                </Button>
                </Modal.Actions>
            </Modal>
        )
    }
}

export default DeleteModal;