import React from 'react';
import ContentModule from '../../shared_components/ContentModule';
import {
    Form, FormRow, FormField, FormInput, FormIconField, FormSelect, Dropdown,
    Glyph, Button, ButtonGroup,
    Row, Col,
    Modal, ModalHeader, ModalBody, ModalFooter
} from 'elemental'

export default React.createClass({

    renderResults: function () {
        var results = this.props.results;
        var dashboard_index = this.props.index;

        var rendered_results = results.map(function (report, i) {
            var dkey = dashboard_index + "_rd_" + i;
            var colour = report.colour;

            return (
                <a title={report.name}><Glyph key={dkey} icon='file-text' type={colour}/></a>
            )
        });

        return rendered_results;
    },
    renderDate: function () {
        var date = this.props.date;
        var details = this.props.details;

        return (
            <a href="javascript:;" onClick={this.getStdIO} key={details}> {date}</a>
        )
    },
    getStdIO: function () {
        var url = this.props.details;
        console.log("getStdIO( " + url + " )");
        var oReq = new XMLHttpRequest();
        oReq.open("GET", url);
        oReq.setRequestHeader("Authorization", "Basic " + btoa(localStorage.getItem('autodash')));

        oReq.onload = function () {
            var data = oReq.responseText;

            var newWindow = window.open('text/plain');

            data = data
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
                .replace(/\n/g, "<br/>");

            // and then do
            newWindow.document.write(data);
        };
        oReq.send();
    },
    render: function () {
        var grayLineStyle = {
            backgroundColor: "#f5f5f5",
            paddingTop: "5px",
            paddingBottom: "5px",
        };

        var whiteLineStyle = {
            paddingTop: "5px",
            paddingBottom: "5px",
        };

        return (
            <Row style={ this.props.index % 2 == 0 ? grayLineStyle : whiteLineStyle }>
                <Col sm="10%">{this.renderDate()}</Col>
                <Col sm="20%"><a href={this.props.commit}>{this.props.repo}</a></Col>
                <Col sm="5%">{this.props.sec}</Col>
                <Col sm="7%">{this.props.overall}</Col>
                <Col sm="7%">{this.props.pass}</Col>
                <Col sm="8%">{this.props.cover}</Col>
                <Col sm="5%">{this.props.np}</Col>
                <Col sm="5%">{this.props.nf}</Col>
                <Col sm="5%">{this.props.ns}</Col>
                <Col sm="28%">{this.renderResults()}</Col>
            </Row>
        )
    }
})