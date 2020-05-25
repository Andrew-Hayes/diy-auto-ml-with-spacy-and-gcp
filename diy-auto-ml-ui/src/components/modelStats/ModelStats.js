import React from 'react';
import { Header, Grid } from 'semantic-ui-react';
import {epoch_to_local} from '../../utils/helpers'
import RadialChart from '../radialChart/RadialChart'

const ModelStats = (props) => (
        <Grid columns={5} divided>
            <Grid.Row>
                <Grid.Column>
                    <Grid style={{ textAlign: "center" }}>
                        <Grid.Column width={12} style={{ margin: "auto" }}>
                            <Header style={{ marginBottom: "2px" }} as='h3'>Last Updated</Header>
                            <Header style={{ marginTop: "10px" }} as='h3'>{epoch_to_local(props.created_at)}</Header>
                        </Grid.Column>
                    </Grid>
                </Grid.Column>
                <Grid.Column>
                    <Grid style={{ textAlign: "center" }}>
                        <Grid.Column width={12} style={{ margin: "auto" }}>
                            <Header style={{ marginBottom: "2px" }} as='h3'>Analysed</Header>
                            <Header style={{ marginTop: "2px" }} as='h1'>{props.entries} Items</Header>
                        </Grid.Column>
                    </Grid>
                </Grid.Column>
                <Grid.Column>
                    <Grid style={{ textAlign: "center" }}>
                        <Grid.Column width={3}>
                            <RadialChart progress={props.fvalue * 100} color="#3c71d0" />
                        </Grid.Column>
                        <Grid.Column width={9} style={{ margin: "auto" }}>
                            <Header style={{ marginBottom: "2px" }} as='h3'>Precision</Header>
                            <Header style={{ marginTop: "2px" }} as='h1'>{props.fvalue * 100}%</Header>
                        </Grid.Column>
                    </Grid>
                </Grid.Column>
                <Grid.Column>
                    <Grid style={{ textAlign: "center" }}>
                        <Grid.Column width={3}>
                            <RadialChart progress={props.predict * 100} color="#3c71d0" />
                        </Grid.Column>
                        <Grid.Column width={9} style={{ margin: "auto" }}>
                            <Header style={{ marginBottom: "2px" }} as='h3'>Predict</Header>
                            <Header style={{ marginTop: "2px" }} as='h1'>{props.predict * 100}%</Header>
                        </Grid.Column>
                    </Grid>
                </Grid.Column>
                <Grid.Column>
                    <Grid style={{ textAlign: "center" }}>
                        <Grid.Column width={3}>
                            <RadialChart progress={props.recall * 100} color="#3c71d0" />
                        </Grid.Column>
                        <Grid.Column width={9} style={{ margin: "auto" }}>
                            <Header style={{ marginBottom: "2px" }} as='h3'>Recall</Header>
                            <Header style={{ marginTop: "2px" }} as='h1'>{props.recall * 100}%</Header>
                        </Grid.Column>
                    </Grid>
                </Grid.Column>
            </Grid.Row>
        </Grid>
);

export default ModelStats;
