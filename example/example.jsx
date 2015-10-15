if( Meteor.isClient ){
  const {Router, Route, Link} = ReactRouter;
  const {CSSTransitionGroup} = React.addons;
  const history = ReactRouter.history.useQueries(ReactRouter.history.createHistory)()

  Data = new Mongo.Collection();
  _(10).times(function(){
    Data.insert({number: _.random(0,10)});
  });

  Animating = false;
  App = React.createClass({
    render(){
      Animating = true;
      Meteor.setTimeout(function(){
        Animating = false;
      },5000)
      return (
        <CSSTransitionGroup
          transitionName='example'
          component='div'>
          <div key={this.props.location.pathname}
          className="example"
          >{this.props.children}</div>
        </CSSTransitionGroup>
      );
    }
  });

  Meteor.setInterval(function(){
    Data.find().forEach(function(d){
      Data.update({_id: d._id},{$set: {number: _.random(0,100)}});
    });
  },10);

  Page1 = MeteorData(React.createClass({
    render(){
      return <Link to='/page2'><h1>Hello World</h1></Link>;
    }
  }));

  Page2 = MeteorData(React.createClass({
    render(){
      _(100).times(function(i){
        Math.sqrt(i);
      });
      console.log( "Rendering" )
      let numbers = _.map( this.props.data, function(d){
        return (<span key={d._id}>{d.number}</span>);
      });
      return <div><Link to='/page1'><h1>Hola World</h1></Link>{numbers}</div>
    }
  }),{
    getData(){
      return Data.find().fetch();
    },

    shouldUpdate(props){
      if( Animating ){
        // Should use a unique key in hash instead
         //RedrawQueue.push(self);
         return false;
      }else{
        return true;
      }
    }
  });

  Meteor.startup(function() {
    React.render((
      <Router history={history}>
        <Route path="/" component={App}>
          <Route path="/page1" component={Page1} />
          <Route path="/page2" component={Page2} />
        </Route>
      </Router>
    ), document.body);
  });
}
