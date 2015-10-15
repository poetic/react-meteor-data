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
    componentWillMount: function() {
      var self = this;
      self._subs = [];

      if( requestSubscriptions ){
        var subRequests = requestSubscriptions( self.props );
        if( subRequests ){
          _.each(subRequests, function( subscriptionArgs){
            self._subs.push( subFunc( ...subscriptionArgs ) );
          });
        }
      }

      self._meteorStateDep = new Tracker.Dependency();
      self._meteorFirstRun = true;

      if (Meteor.isClient) {
        if( getData ){
          self.data = getData( self.props );
        }
        Tracker.autorun(function(computation) {
          self._meteorComputation = computation;
          self._meteorStateDep.depend();

          if( getData ){
            self.data = getData( self.props );
            React.Children.forEach(function(component){
              component.setState(self.data);
            });
          }

          self._meteorCalledSetState = true;
          self.setState(this.data);
        });

      } else {
        self._meteorCalledSetState = true;
        self.setState({data: this.data});
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
      return <Component data={this.data} {...this.props}/>;
    }
  });

  return newComponent;
};
