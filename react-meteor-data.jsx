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
    displayName: 'meteorData',
    mixins: [ReactMeteorData],

    getMeteorData(){
      return getData(this.props);
    },

    render(){
      return <Component {...this.props} {...this.data}/>;
    }
  });

  return newComponent;
};
