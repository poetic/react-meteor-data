Wrap your component to get meteor data, handle subscriptions, and stop updates
due to meteor data causing re-render.

    SomeClass = MeteorData(React.createClass({
      render(){
        // Use the data
        this.props.item;

        //...
      }
    }),
    {
      getData(){
        return {item: Item.findOne()};
      },
    });

