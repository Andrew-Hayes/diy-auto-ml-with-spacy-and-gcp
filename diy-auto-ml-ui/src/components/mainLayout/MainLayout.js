import React from 'react';
import { Header, Grid } from 'semantic-ui-react';
import LeftMenu from '../leftMenu/LeftMenu'
import AppMenu from '../menu/AppMenu'

const MainLayout = (props) => (
    <div style={{ minHeight: "100%" }}>
    <Grid celled style={{margin: '0px'}}>
        <Grid.Row>
            <Grid.Column width={2} style={{backgroundColor: "#F2F2F2", paddingBottom: '3px', paddingTop: '3px'}}>
                <Header as='h4'>
                    <Header.Content>
                    DIY AutoML NLP
                    <Header.Subheader>using firebase...</Header.Subheader>
                    </Header.Content>
                </Header>
            </Grid.Column>
            <Grid.Column stretched width={14} style={{padding: '0px', backgroundColor: "#F8F8F8"}}>
                <AppMenu subMenu={props.subMenu}  user={props.user} />    
            </Grid.Column>
        </Grid.Row>
        <Grid.Row>
            <Grid.Column width={2} style={{padding: '0px', backgroundColor: "#F2F2F2"}}>
                <LeftMenu activeItem={props.viewName}/>
            </Grid.Column>
            <Grid.Column stretched width={14}>
                {props.children}
            </Grid.Column>
        </Grid.Row>
    </Grid>
</div>
);

export default MainLayout;
