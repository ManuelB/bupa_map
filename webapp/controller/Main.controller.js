sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */

    
    function (Controller, JSONModel, Filter, FilterOperator, MessageToast) {
        "use strict";

        const searchCache = {};

        return Controller.extend("bupamap.controller.Main",
        {
            onInit: function () {
                const oMapModel = new JSONModel();
                this.getView().setModel(oMapModel, "Map");
                const oRestaurants = new JSONModel();
                this.getView().setModel(oRestaurants, "Restaurants");
                const oItemsBinding = this.byId("table").getBindingInfo("items");
                oItemsBinding.events = {
                    "dataReceived" : () => {
                        this.rebuildBupaPoints();
                    }
                };
            },
            

            onButtonPress: function() {
                var saveText = this.getView().getModel("i18n").getResourceBundle().getText("textSave");
                MessageToast.show(saveText);
            },
            onAfterRendering: function() {
                const oMap = this.byId("map");
                oMap.attachEvent("click", this.onMapClick, this);
              },
              
              onMapClick: function(oEvent) {
                const oMap = this.byId("map");
                const oCoordinates = oMap.getCoordinateFromPixel([oEvent.getParameter("pixelX"), oEvent.getParameter("pixelY")]);
                const aRestaurants = this.getRestaurantsNearCoordinates(oCoordinates);
                this.showRestaurantsPopup(aRestaurants);
              },
              
            findRestaurants: async function() {
                         
                const coord = this.getCoordinates("Altenessener Straße 402 45329 Essen DE");
                const query = `[out:json];
                area[name="Essen"]->.a;
                node["amenity"="restaurant"](around:500, 51.451389, 7.013889);
                out;`;
                const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
                const response = await fetch(url);
                const data = await response.json();
                
                const restaurants = data.elements.filter(elem => elem.tags && elem.tags.amenity === "restaurant"); 
                const aFeatures = []; for ( let restaurant of restaurants ){
                    aFeatures.push({"wkt": "POINT("+restaurant.lon+" "+restaurant.lat+")"});
                }
                const oRestaurants = this.getView().getModel("Restaurants");
                const oData = {features: aFeatures};
                    oRestaurants.setData(oData);
                return restaurants;
                
            },
        
            getCenter: function() {
                const oMapModel = this.getView().getModel("Map");
                const oDataModel = this.getView().getModel();
                const aBusinessPartner = this.byId("table").getBinding("items").getAllCurrentContexts().map(oContext => oDataModel.getProperty(oContext.getPath()));
                const aFeaturePromises = aBusinessPartner.map(oBusinessPartner => {
                    return this.getCoordinates(oBusinessPartner.AddressLine1Text);
                });
                const oZeigen = Promise.all(aFeaturePromises).then(aFeatures => {
                    const oData = {features: aFeatures};
                });
               // const oTest = this.getCoordinates("Altenessener Straße 402 45329 Essen DE")
                sap.m.MessageToast.show(aBusinessPartner);
                
            },
            
            rebuildBupaPoints: function() {
                const oMapModel = this.getView().getModel("Map");                
                const oDataModel = this.getView().getModel();
                const aNodes = this.byId("table").getBinding("items").getAllCurrentContexts().map(oContext => oDataModel.getProperty(oContext.getPath()));
                const aBusinessPartner = this.byId("table").getBinding("items").getAllCurrentContexts().map(oContext => oDataModel.getProperty(oContext.getPath()));
                const aFeaturePromises = aBusinessPartner.map(oBusinessPartner => {
                    return this.getCoordinates(oBusinessPartner.AddressLine1Text);
                });
                Promise.all(aFeaturePromises).then(aFeatures => {
                    const oData = {features: aFeatures};
                    oMapModel.setData(oData);
                    
                });
            },

            onAddfeature: function() {
                const oBupaVectorSource= this.byId("vectorSource");
                const aExtent = oBupaVectorSource.getExtent();
                if(aExtent && aExtent[0] !== Infinity) {
                    this.byId("map").viewFit(aExtent, true);
                }
            },
/*             onFilterBupa: function(oEvent) {
                const sSearch = oEvent.getParameter("query");
                if(sSearch) {
                    this.byId("table").getBinding("items").filter([new Filter("Name", FilterOperator.Contains, sSearch)])
                    this.byId("table").getBinding("items").filter([new Filter("AddressLine1Text", FilterOperator.Contains, sSearch)]);
                    this.byId("table").getBinding("items").filter([new Filter("Region", FilterOperator.Contains, sSearch)]);
                    this.byId("table").getBinding("items").filter([new Filter("Role", FilterOperator.Contains, sSearch)])
                } 
                else {
                    this.byId("table").getBinding("items").filter([]);
                }
            }, */

            onFilterBupa: function(oEvent) {
                const sSearch = oEvent.getParameter("query");
                if(sSearch) {
                    const oFilter1 = new Filter("Name", FilterOperator.Contains, sSearch);
                    const oFilter2 = new Filter("AddressLine1Text", FilterOperator.Contains, sSearch);
                    const oFilter3 = new Filter("Region", FilterOperator.Contains, sSearch);
                    const oFilter4 = new Filter("Role", FilterOperator.Contains, sSearch);
                    
                    // Combine the filters using logical OR
                    const oCombinedFilter = new Filter({
                        filters: [oFilter1, oFilter2, oFilter3, oFilter4],
                        and: false
                    });
            
                    this.byId("table").getBinding("items").filter([oCombinedFilter]);
                } 
                else {
                    this.byId("table").getBinding("items").filter([]);
                }
            },
            
            getCoordinates: function(sValue) {
                const googleMapsApiToken = "AIzaSyB5T8aWSEsK0bMuYiSjUtzQRp9GUCE6mDA";
                if(!(sValue in searchCache)) {
                    searchCache[sValue] = new Promise(function(resolve, reject) {
                        fetch("https://maps.googleapis.com/maps/api/geocode/json?address=" + encodeURIComponent(sValue) + "&key=" + googleMapsApiToken).then(function(oResponse) {
                            return oResponse.json();
                        }).then(function(oLocation) {
                            try {
                                if ("results" in oLocation && oLocation.results.length > 0) {
                                    var dGoogleLongitude = oLocation.results[0].geometry.location.lng;
                                    var dGoogleLatitude = oLocation.results[0].geometry.location.lat;
                                    console.log(searchCache[sValue]);
                                    // POINT(11.3932675123215 48.2635197942589)
                                    resolve({"wkt": "POINT("+dGoogleLongitude+" "+dGoogleLatitude+")"});
                                }
                            } catch (e) {
                                console.log(e);
                                reject(e);
                            }
                        });
                    });
                }
                return searchCache[sValue];
            },


        });
        
    });
    
