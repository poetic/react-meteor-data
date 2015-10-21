/*
 * component:     React class that needs meteor data
 * getData:       function that returns meteor data as prop to child
 * subscriptions: Function that returns list of list of sub arguments.
 * subFunc:       Default to Meteor.subscribe if not defined.  Useful
 *                for usage with a subscription cacher
 */

MeteorData = function MeteorData( Component, options ){
  let {getData} = (options || {});

  var newComponent = React.createClass({
    componentWillMount() {
      this.data = {};
      this._meteorDataManager = new MeteorDataManager(this);
      const newData = this._meteorDataManager.calculateData();
      this._meteorDataManager.updateData(newData);
    },

    componentWillUpdate(nextProps, nextState) {
      const saveProps = this.props;
      const saveState = this.state;
      let newData;
      try {
        // Temporarily assign this.state and this.props,
        // so that they are seen by getMeteorData!
        // This is a simulation of how the proposed Observe API
        // for React will work, which calls observe() after
        // componentWillUpdate and after props and state are
        // updated, but before render() is called.
        // See https://github.com/facebook/react/issues/3398.
        this.props = nextProps;
        this.state = nextState;
        newData = this._meteorDataManager.calculateData();
      } finally {
        this.props = saveProps;
        this.state = saveState;
      }

      this._meteorDataManager.updateData(newData);
    },

    componentWillUnmount() {
      this._meteorDataManager.dispose();
    },

    getMeteorData: getData,

    render(){
      console.log( this.data );
      return <Component {...this.props} {...this.state.data} loadingData={this.state.loadingData}/>;
    }
  });

  return newComponent;
};

// A class to keep the state and utility methods needed to manage
// the Meteor data for a component.
class MeteorDataManager {
  constructor(component) {
    this.component = component;
    this.computation = null;
    this.oldData = null;
  }

  dispose() {
    if (this.computation) {
      this.computation.stop();
      this.computation = null;
    }
  }

  calculateData() {
    const component = this.component;
    const {props, state} = component;

    if (! component.getMeteorData) {
      return null;
    }

    // When rendering on the server, we don't want to use the Tracker.
    // We only do the first rendering on the server so we can get the data right away
    if (Meteor.isServer) {
      return component.getMeteorData();
    }

    if (this.computation) {
      this.computation.stop();
      this.computation = null;
    }

    let data;
    // Use Tracker.nonreactive in case we are inside a Tracker Computation.
    // This can happen if someone calls `React.render` inside a Computation.
    // In that case, we want to opt out of the normal behavior of nested
    // Computations, where if the outer one is invalidated or stopped,
    // it stops the inner one.
    this.computation = Tracker.nonreactive(() => {
      return Tracker.autorun((c) => {
        if (c.firstRun) {
          const savedSetState = component.setState;
          try {
            component.setState = () => {
              throw new Error(
"Can't call `setState` inside `getMeteorData` as this could cause an endless" +
" loop. To respond to Meteor data changing, consider making this component" +
" a \"wrapper component\" that only fetches data and passes it in as props to" +
" a child component. Then you can use `componentWillReceiveProps` in that" +
" child component.");
            };

            data = component.getMeteorData();
          } finally {
            component.setState = savedSetState;
          }
        } else {
          // Stop this computation instead of using the re-run.
          // We use a brand-new autorun for each call to getMeteorData
          // to capture dependencies on any reactive data sources that
          // are accessed.  The reason we can't use a single autorun
          // for the lifetime of the component is that Tracker only
          // re-runs autoruns at flush time, while we need to be able to
          // re-call getMeteorData synchronously whenever we want, e.g.
          // from componentWillUpdate.
          c.stop();
          // Calling forceUpdate() triggers componentWillUpdate which
          // recalculates getMeteorData() and re-renders the component.
          component.forceUpdate();
        }
      });
    });

    if (Package.mongo && Package.mongo.Mongo) {
      Object.keys(data).forEach(function (key) {
        if (data[key] instanceof Package.mongo.Mongo.Cursor) {
          console.warn(
  "Warning: you are returning a Mongo cursor from getMeteorData. This value " +
  "will not be reactive. You probably want to call `.fetch()` on the cursor " +
  "before returning it.");
        }
      });
    }

    return data;
  }

  updateData(newData) {
    const component = this.component;
    const oldData = this.oldData;

    if (! (newData && (typeof newData) === 'object')) {
      throw new Error("Expected object returned from getMeteorData");
    }
    // update componentData in place based on newData
    for (let key in newData) {
      component.data[key] = newData[key];
    }
    // if there is oldData (which is every time this method is called
    // except the first), delete keys in newData that aren't in
    // oldData.  don't interfere with other keys, in case we are
    // co-existing with something else that writes to a component's
    // this.data.
    if (oldData) {
      for (let key in oldData) {
        if (!(key in newData)) {
          delete component.data[key];
        }
      }
    }
    this.oldData = newData;
  }
}


/*
 * component:     React class that needs meteor data
 * getData:       function that returns meteor data as prop to child
 * subscriptions: Function that returns list of list of sub arguments.
 * subFunc:       Default to Meteor.subscribe if not defined.  Useful
 *                for usage with a subscription cacher
 */
MeteorData = function MeteorData( Component, options ){
  let {getData, requestSubscriptions, shouldUpdate, subFunction} = (options || {});
  if( !subFunction ){ subFunction = Meteor.subscribe; }

  var newComponent = React.createClass({
    loadingData(){
      let self = this;
      let loading = false;
      _.each(self._subs,function(s){
        if( !s.ready() ){
          loading = true;
        }
      });
      return loading;
    },

    subscribe(  ){
      let self = this;

      if( Meteor.isClient ){
        if( requestSubscriptions ){
          var subRequests = requestSubscriptions( self.props );
          if( subRequests ){
            self.loading = true;

            let checkLoading = function(){
              // Set loading to false after all subs complete
              self.changeState({loadingData: self.loadingData()});
              self._meteorStateDep.changed();
            }
            console.log( subRequests );
            _.each(subRequests, function( subscriptionArgs){
              subscriptionArgs.push( checkLoading );
              self._subs.push( subFunction( ...subscriptionArgs ) );
            });
            // Set to true since we now have loading subs
            self.changeState({loadingData: self.loadingData()});
          }
        }
      }
    },

    changeState( state ){
      this._meteorCalledSetState = true;
      this.setState( state );
    },

    componentWillMount: function() {
      var self = this;
      self._subs = [];
      // Sets to false to start with.
      self.changeState({loadingData: self.loadingData()});

      self._meteorStateDep = new Tracker.Dependency();
      self._meteorFirstRun = true;

      self.subscribe();

      if (Meteor.isClient) {
        if( getData ){
          self.data = getData( self.props );
        }

        Tracker.autorun(function(computation) {
          self._meteorComputation = computation;
          self._meteorStateDep.depend();
          if( getData ){
            self.changeState({data: getData( self.props)});
          }
        });

      } else {
        if( getData ){
          self.changeState({data: getData( self.props)});
        }
      }
    },

    componentWillUpdate: function(nextProps, nextState) {
      if (this._meteorCalledSetState) {
        // If this component update was triggered by the ReactMeteor.Mixin,
        // then we do not want to trigger the change event again, because
        // that would lead to an infinite update loop.
        this._meteorCalledSetState = false;
        return;
      }

      if (this._meteorStateDep) {
        this._meteorStateDep.changed();
      }
    },

    shouldComponentUpdate: shouldUpdate,

    componentWillUnmount: function() {
      if (this._meteorComputation) {
        this._meteorComputation.stop();
        this._meteorComputation = null;
      }

      _.each( this._subs, function( sub ){
        sub.stop();
      });
    },

    render(){
      console.log( this.state.data );
      return <Component {...this.props} {...this.state.data} loadingData={this.state.loadingData}/>;
    }
  });

  return newComponent;
};
