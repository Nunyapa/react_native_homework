/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */
import 'react-native-gesture-handler';
import React, {Component} from 'react';
import {View, Button, Text, StyleSheet, FlatList, ScrollView, ActivityIndicator} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {LineChart} from "react-native-chart-kit";
import {Picker} from '@react-native-community/picker';
import moment from 'moment'

const Stack = createStackNavigator();

const chartConfig = {
  backgroundGradientFrom: "#1E2923",
  backgroundGradientFromOpacity: 0,
  backgroundGradientTo: "#08130D",
  backgroundGradientToOpacity: 0.5,
  color: (opacity = 1) => `rgba(26, 66, 146, ${opacity})`,
  strokeWidth: 2, // optional, default 3
  barPercentage: 1,
  useShadowColorFromDataset: false // optional
};



async function getCountries() {

  var url = "https://api.covid19api.com/summary";
  var response = await fetch(url);
  var d = await response.json();
  return d;
};


async function createData(CountryCode){
  const startDate = moment(Date.parse('January 1, 2020 00:00:00'));
  var detailedData = [];
  var data = {
    labels: [],
    datasets: [
      {
        data: []
      }
    ],
    dayOne: 0,
  };
  var url = `https://api.covid19api.com/dayone/country/${CountryCode}`;
  var response = await fetch(url);
  var json = await response.json();
  var counter = 0;
  json.forEach(i => {
    if (counter == 0){
      const firstDate = moment(Date.parse(i.Date));
      for(let i = 0; i < Math.abs(startDate.diff(firstDate, 'days')); i++, counter++){
        data.labels.push(counter);
        data.datasets[0].data.push(0);
        // console.log(counter);
        detailedData.push({date: moment(Date.parse('January 1, 2020 00:00:00')).add(counter, 'days').format("YYYY-MM-DD"), confirmed: '0', dead: '0', key: counter});
      }
      data.dayOne = counter;
    }
    data.labels.push(counter);
    data.datasets[0].data.push(parseInt(i.Confirmed));
    detailedData.push({date: i.Date.slice(0, 10), confirmed: i.Confirmed.toString(), dead: i.Deaths.toString(), key: counter});
    counter += 1;
  });
  return [data, detailedData];
};




class App extends Component{

  render(){
    return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen  name='Tracker' component={mainScreen}/>
        <Stack.Screen  name='Details' component={details}/>
      </Stack.Navigator>
    </NavigationContainer>
    );
  }
}

class mainScreen extends Component{

  constructor(props){
    super(props);
    this.state = {
      cc: 'RU',
      listCountries: [],
      dataOfCountries: new Map(),
      countryToCode: new Map(),
      data: null,
      detailedData: null,
      loading1: true,
      loading2: true
    };
  }
 

  componentDidUpdate(prevProps, prevState){
    if (prevState.cc != this.state.cc){
      this.GetData();
    }
  }

  GetData(){
    var localListCountries = [];
    var localDataOfCountry = new Map();
    try{
      getCountries().then(
        (data)=>{
          data.Countries.forEach(
            (i) => {
              localListCountries.push({value: i.Country, cc: i.CountryCode});
              localDataOfCountry.set(i.CountryCode, {country: i.Country, totalConfirmed: i.TotalConfirmed, totalDeath: i.TotalDeaths, totalRecovered: i.TotalRecovered});
            }
          )
          this.setState({listCountries: localListCountries, dataOfCountries: localDataOfCountry, loading2: false});
        }
      );
      createData(this.state.cc).then(i=>{
        this.setState({data: i[0], detailedData: i[1], loading1: false});
      });
    } catch (error){
      alert(error);
    }
  }

  componentDidMount(){
   this.GetData();
  }


  render(){
    var listCountries = this.state.listCountries;
    var dataOfCountries =  this.state.dataOfCountries;
    var data = this.state.data;
    if (!this.state.loading1 && !this.state.loading2){
      return (
        <View style={styles.container}>

          <View>
            <Text style={{backgroundColor: 'palegreen', height: 40, textAlign:'center', fontSize: 18}}>Country: {dataOfCountries.get(this.state.cc).country} </Text>
            <Text style={{backgroundColor: 'skyblue',  height: 40,  textAlign:'center', fontSize: 18}}>
              Active: {dataOfCountries.get(this.state.cc).totalDeath - dataOfCountries.get(this.state.cc).totalRecovered + dataOfCountries.get(this.state.cc).totalConfirmed} 
            </Text>
            <Text style={{backgroundColor: 'orange', height: 40,  textAlign:'center', fontSize: 18}}>Confirmed: {dataOfCountries.get(this.state.cc).totalConfirmed} </Text>
            <Text style={{backgroundColor: 'salmon',  height: 40,  textAlign:'center', fontSize: 18}}>Dead: {dataOfCountries.get(this.state.cc).totalDeath} </Text>
            
          </View>


          <Button
            title="Details"
            onPress={() =>{
                  this.props.navigation.navigate('Details', {
                  data: this.state.detailedData
                  });
              }
            }
          />


          <Picker 
            style={{fontSize:14, height:30}}
            selectedValue={this.state.cc}
            onValueChange={value => this.setState({cc: value})}
            mode="dropdown">
              {listCountries.map(
                (country) => 
                  {
                    return <Picker.Item key={country.cc} label={country.value} value={country.cc}/>;
                  }
                )
              }
          </Picker>

          <View style={styles.container}>
            <View style={{margin: 10}}>
              <Text style={{fontSize: 14}}>    The graph shows amount of confirmed people per day from january 1, 2020</Text>
            </View>
            <ScrollView 
            horizontal 
            style={styles.graphcontainer}
            ref={(view) => this._scrollview = view}
            onContentSizeChange={(w, h) => this._scrollview.scrollTo({x:w, y:h, animated:true})}
            >
              <LineChart
                data={data}
                width={data.datasets[0].data.length * 42}
                height={320}
                chartConfig={chartConfig}
              />
            </ScrollView>

          </View>

        </View>

      );
    }
    else{
      return (
        <View style={styles.activityIndicatorStyle}>
          <ActivityIndicator />
        </View>
        );
    }
  }
}


function details({route, navigation}){
  const data = route.params.data;
  data.sort((a,b)=> b.key - a.key);
  // console.log(data);
  return (
    <View style={styles.container}>
      <View style={styles.tableHeader}>
        <View style={styles.headerCell}>
          <Text> Date </Text>
        </View>
        <View style={styles.headerCell}>
          <Text> Confirmed </Text>
        </View>
        <View style={styles.headerCell}>
          <Text> Dead </Text>
        </View>
      </View>
      <FlatList
        data={data}
        renderItem={({item}) => 
          <View style={styles.table}>
            <View style={styles.cell}>
              <Text >{item.date} </Text>
            </View>
            <View style={styles.cell}>
              <Text >{item.confirmed}</Text>
            </View>
            <View style={styles.cell}>
              <Text >{item.dead}</Text>
            </View>
          </View>
        }
        keyExtractor={item => item.key.toString()} 
      />
    </View>
    ); 
}


const styles = StyleSheet.create({
  
  activityIndicatorStyle:{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  graph: {
    flex: 1,
    paddingTop: 10,
  },
  graphcontainer: {
    flex: 1,
    margin: 10,
  },
  container:{
    flex: 1,
  },
  endBox:{
    paddingLeft: 40,
  },
  table:{
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'steelblue',

  },
  cell:{
    flex: 1,
    backgroundColor: 'powderblue',
    // marginRight: 10,
    borderWidth: 1,
    borderColor: 'skyblue',
    alignItems: 'center'
  },
  tableHeader:{
    flexDirection: 'row',
  },
  headerCell:{
    flex: 1,
    backgroundColor: 'steelblue',
    // marginRight: 10,
    borderWidth: 1,
    borderColor: 'skyblue',
    alignItems: 'center'
  }
});


export default App;