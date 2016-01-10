const React = require('react');

// this is a placeholder component on initial load/mount to occupy the space
// that the component will cover in order to prevent any inducement of jank.
const WaitingCardListItem = React.createClass({

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        // noop
    },

    render() {

        return (
            <li className="list-group-item">
                <h6 className="list-group-item-heading m-y-0">
                    <a href="#" onClick={this.onClick} style={{color: '#ffffff'}} >
                        {'loading'}
                    </a>
                </h6>
                <p className="list-group-item-text m-y-0">
                    <small className="text-muted">
                        {`Card #`}
                    </small>
                    <br/>
                    <small>
                        {'deck path'}
                    </small>
                </p>
            </li>
        );
    }
});

module.exports = WaitingCardListItem;