const React = require('react');
const Immutable = require('immutable');
const invariant = require('invariant');

const {types: ROUTES} = require('store/routes');
const {ReviewPatch} = require('store/review');

const courier = require('courier');

const {tabs} = require('constants/cardprofile');

const CardDetail = require('components/card/index');
const ReviewTabBar = require('components/review/tabbar');
const difficulty = require('constants/difficulty');

const StashHeader = require('./header');

const CardReview = React.createClass({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    propTypes: {
        currentStashID: React.PropTypes.number.isRequired,
        currentTab: React.PropTypes.oneOf([tabs.front, tabs.back, tabs.description, tabs.stashes, tabs.meta]),
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },

    getInitialState() {
        return {

            isEditing: false,
            disableSave: false,

            difficulty: difficulty.none,

            // hide back-side of card when being reviewed
            reveal: false
        };
    },

    resetState() {

        this.setState({

            isEditing: false,
            disableSave: false,

            difficulty: difficulty.none,

            // hide back-side of card when being reviewed
            reveal: false
        });

        const stashID = this.props.currentStashID;
        const cardID = this.props.card.get('id');
        this.context.store.routes.toCardReviewInStashFront(cardID, stashID);
    },

    componentWillMount() {

        // redirect to front side of card if back-side shouldn't be revealed yet
        if(this.props.currentTab === tabs.back && !this.state.reveal) {

            const stashID = this.props.currentStashID;
            const cardID = this.props.card.get('id');
            this.context.store.routes.toCardReviewInStashFront(cardID, stashID);
        }

    },

    onClickBackButton() {
        const stashID = this.props.currentStashID;
        const cardID = this.props.card.get('id');

        this.context.store.routes.toStashCard(cardID, stashID);
    },

    onSwitchCurrentTab(tabType) {

        const stashID = this.props.currentStashID;
        const cardID = this.props.card.get('id');

        switch(tabType) {

        case tabs.front:

            this.context.store.routes.toCardReviewInStashFront(cardID, stashID);
            break;

        case tabs.back:

            this.context.store.routes.toCardReviewInStashBack(cardID, stashID);
            break;

        case tabs.description:

            this.context.store.routes.toCardReviewInStashDescription(cardID, stashID);
            break;

        case tabs.meta:

            this.context.store.routes.toCardReviewInStashMeta(cardID, stashID);
            break;

        // note: stashes not supported; cannot change stashes of card, while
        // reviewing it in a stash

        default:
            invariant(false, `Unexpected tabType. Given: ${String(tabType)}`);

        }

    },

    onCardSave(patch) {

        this.setState({
            isEditing: false
        });

        const cardID = this.props.card.get('id');

        this.context.store.cards.patch(cardID, patch);
    },

    editCard() {

        this.setState({
            isEditing: true
        });

    },

    onCancelEdit() {

        this.setState({
            isEditing: false
        });

    },

    onDelete() {

        const stashID = this.props.currentStashID;
        this.context.store.routes.toStashCards(stashID);
    },

    onReveal() {

        const stashID = this.props.currentStashID;
        const cardID = this.props.card.get('id');

        this.context.store.routes.toCardReviewInStashBack(cardID, stashID);

        this.setState({
            reveal: true
        });

    },

    onNext() {

        const stashID = this.props.currentStashID;
        const cardID = this.props.card.get('id');

        const currentDifficulty = this.state.difficulty;

        const patch = new ReviewPatch(cardID);

        patch.difficulty(currentDifficulty);
        patch.skipCard(false);

        this.context.store.review.reviewCard(patch)
            .then(() => {

                this.resetState();

                this.context.store.routes.toCardReviewInStashFront(cardID, stashID);

                // for bluebird v3 warnings
                return null;
            });

    },

    onSkip() {
        // this should never be called
    },


    onChooseDifficulty(difficultyTag) {

        this.setState({
            difficulty: difficultyTag
        });
    },

    render() {

        // bail early
        if(this.props.currentTab === tabs.back && !this.state.reveal) {
            return null;
        }

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-b">
                        <StashHeader stashID={this.props.currentStashID} />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <CardDetail

                            hideStashes

                            isReviewing
                            hideBack={!this.state.reveal}

                            // when reviewing the card individually,
                            // don't show edit button
                            hideEdit

                            currentTab={this.props.currentTab}
                            currentCard={this.props.card}

                            isEditing={this.state.isEditing}
                            disableSave={this.state.disableSave}

                            backButtonLabel="Stop Reviewing Card"
                            onClickBackButton={this.onClickBackButton}

                            onSwitchCurrentTab={this.onSwitchCurrentTab}

                            onCardSave={this.onCardSave}
                            editCard={this.editCard}
                            onCancelEdit={this.onCancelEdit}
                            onDelete={this.onDelete}
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <hr />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <ReviewTabBar
                            noSkip
                            reveal={this.state.reveal}
                            difficulty={this.state.difficulty}
                            onReveal={this.onReveal}
                            onNext={this.onNext}
                            onSkip={this.onSkip}
                            onChooseDifficulty={this.onChooseDifficulty}
                        />
                    </div>
                </div>
            </div>
        );

    }

});

module.exports = courier({

    contextTypes: {
        store: React.PropTypes.object.isRequired
    },

    component: CardReview,
    onlyWaitingOnMount: true,

    watch(props, manual, context) {

        return [
            context.store.routes.watchRoute(),
            context.store.cards.watchCurrent(),
        ];
    },

    assignNewProps: function(props, context) {

        // fetch reviewable card for stash
        return context.store.cards.current()
            .then(function(card) {

                const route = context.store.routes.route();

                let currentTab;

                switch(route) {

                case ROUTES.STASHES.CARD.REVIEW.VIEW.FRONT:

                    currentTab = tabs.front;
                    break;

                case ROUTES.STASHES.CARD.REVIEW.VIEW.BACK:

                    currentTab = tabs.back;
                    break;

                case ROUTES.STASHES.CARD.REVIEW.VIEW.DESCRIPTION:

                    currentTab = tabs.description;
                    break;

                case ROUTES.STASHES.CARD.REVIEW.VIEW.META:

                    currentTab = tabs.meta;
                    break;

                default:
                    invariant(false, `Unexpected route. Given: ${String(this.props.route)}`);
                }

                const currentStashID = context.store.stashes.currentID();

                return {
                    card: card,
                    currentTab: currentTab,
                    currentStashID: currentStashID
                };

            });

    }

});
