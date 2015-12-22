const React = require('react');
const invariant = require('invariant');
const classnames = require('classnames');

const orwell = require('orwell');

const Library = require('./library');
const Stashes = require('./stashes');
const Settings = require('./settings');

const {types: ROUTES} = require('store/routes');

const AppRouteHandler = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        view: React.PropTypes.string,
        RouteHandler: React.PropTypes.oneOfType([ React.PropTypes.func, React.PropTypes.string ])
    },

    switchView(view) {
        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            switch(view) {
            case 'library':
                this.context.store.routes.toLibrary();
                break;

            case 'settings':
                this.context.store.routes.toSettings();
                break;

            case 'stashes':
                this.context.store.routes.toStashes();
                break;
            default:
                invariant(false, `Invalid view. Given: ${view}`);
            }

        };

    },

    render() {

        const {RouteHandler, view} = this.props;

        return (
            <div key="app">
                <div className="row">
                    <div className="col-sm-12">
                        <header>
                            <h1 className="display-4 m-y">grokdb</h1>
                        </header>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <ul className="nav nav-pills m-b">
                            <li className="nav-item">
                                <a
                                    className={classnames('nav-link', {'active': view == 'library'})}
                                    onClick={this.switchView('library')}
                                    href="#">
                                    {'Library'}
                                </a>
                            </li>
                            <li className="nav-item">
                                <a
                                    className={classnames('nav-link', {'active': view == 'stashes'})}
                                    onClick={this.switchView('stashes')}
                                    href="#">
                                    {'Stashes'}
                                </a>
                            </li>
                            <li className="nav-item pull-right">
                                <a
                                    className={classnames('nav-link', {'active': view == 'settings'})}
                                    onClick={this.switchView('settings')}
                                    href="#">
                                    {'Settings'}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <RouteHandler />
                    </div>
                </div>
            </div>
        );
    }
});

const App = orwell(AppRouteHandler, {

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    watch(props, manual, context) {
        return context.store.routes.watchRoute();
    },

    assignNewProps(props, context) {

        const route = context.store.routes.route();

        let handler;
        let view;

        switch(route) {

        case ROUTES.SETTINGS:
            handler = Settings;
            view = 'settings';
            break;

        case ROUTES.STASHES:
            handler = Stashes;
            view = 'stashes';
            break;

        case ROUTES.LIBRARY.VIEW.CARDS:
        case ROUTES.LIBRARY.VIEW.DECKS:
            handler = Library;
            view = 'library';
            break;

        default:
            invariant(false, `Unexpected route. Given: ${String(route)}`);
        }

        return {
            view: view,
            RouteHandler: handler
        };
    }
});


// container for everything
const AppContainer = React.createClass({
    render() {
        return (
            <div className="container">
                <App {...this.props} />
                <hr className="m-t-lg"/>
                <footer className="m-b row">
                    <div className="col-sm-6">
                        <a href="https://github.com/dashed/grokdb/issues" target="_blank">{'Bugs? Issues? Ideas?'}</a>
                    </div>
                    <div className="col-sm-6">
                        <div className="btn-group p-b pull-right" role="group" aria-label="Basic example">
                            <button
                                type="button"
                                className="btn btn-warning"
                            >
                                {"Backup database"}
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
        );
    }
});

module.exports = AppContainer;
