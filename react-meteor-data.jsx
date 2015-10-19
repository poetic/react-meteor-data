/*
 * component:     React class that needs meteor data
 * getData:       function that returns meteor data as prop to child
 * subscriptions: Function that returns list of list of sub arguments.
 * subFunc:       Default to Meteor.subscribe if not defined.  Useful
 *                for usage with a subscription cacher
 */
MeteorData = function MeteorData( Component, options ){
  let {getData, requestSubscriptions, shouldUpdate, subFunction} = (options || {});
  if( !subFunc ){ subFunc = Meteor.subscribe; }

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
            }
            _.each(subRequests, function( subscriptionArgs){
              subscriptionArgs.push( checkLoading );
              self._subs.push( subFunc( ...subscriptionArgs ) );
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

      self.subscribe();

      self._meteorStateDep = new Tracker.Dependency();
      self._meteorFirstRun = true;

      if( getData ){
        self.data = getData( self.props );
      }

      if (Meteor.isClient) {

        Tracker.autorun(function(computation) {
          self._meteorComputation = computation;
          self._meteorStateDep.depend();

          if( getData ){
            self.changeState({data: getData( self.props)});
          }

          self.changeState({data: getData( self.props)});
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
      console.log( this.state.loadingData );
      return <Component {...this.props} {...this.state.data} loadingData={this.state.loadingData}/>;
    }
  });

  return newComponent;
};
