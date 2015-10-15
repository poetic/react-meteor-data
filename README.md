Wrap your component to get meteor data, handle subscriptions, and stop updates
due to meteor data causing re-render.

    SomeClass = MeteorData(React.createClass({
      render(){
        // Use the data
        this.props.data;

        //...
      }
    }),
    getData(){
      return Data.find().fetch();
    },

    requestSubscriptions(){
      // Array of Subscriptions (subscription is array of args)
      return [["subscriptiotName", "arg1"]];
    },

    shouldUpdate(props){
      if( dontRedraw ){
         return false;
      }else{
        return true;
      }
    });

