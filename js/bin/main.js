
var calculate = {
  ml_to_mg: function(ml, weight) {
    return ml * weight;
  },
  percent_to_ml: function(bottle_size, percentage) {
    return bottle_size * ( parseFloat(percentage) / 100 );
  }
};


var vm, $list;

// Vue.config.debug = true;

Vue.filter('percent_to_ml', function (percentage) {
  return this.targetBottleSize * ( parseFloat(percentage) / 100 );
});

Vue.filter('ml_to_grams', function (ml, type, custom) {
  if(type === "PG")               { return ml * parseFloat(this.pgWeight); }
  else if(type === "VG")          { return ml * parseFloat(this.vgWeight); }
  else if(custom || custom === 0) { return ml * parseFloat(custom); }
  else if(type == "NIC") {
    return ml * parseFloat(this.nicWeight);
  }
});

Vue.filter('leftover_pg_ml', function (flavor_percentage) {
  return this.targetBottleSize * ( (parseFloat(this.targetRatioPg) - parseFloat(flavor_percentage)) / 100 );
});

Vue.filter('leftover_vg_ml', function (flavor_percentage) {
  return this.targetBottleSize * ( (parseFloat(this.targetRatioVg) - parseFloat(flavor_percentage)) / 100 );
});

Vue.filter('ml_to_drops', function (ml) {
  return ml * this.dropsPerMl;
});

Vue.filter('roundl', function (val, points) {
  return _.round(val, (points || points === 0) ? points : 3);
});


var settingsDefaults = {
  printable: false,

  vgWeight: 1.249,
  pgWeight: 1.0361,
  dropsPerMl: 30,

  targetBottleSize: 30,
  targetNicMg: 3,

  nicBaseMg: 100,
  nicVG: 70,
  nicPG: 30,
  nicPureMg: 1.01,
  nicWeight: 0,
  nicCustomWeight: 0,

  weightSource: 'default',

  targetRatioVg: 70,
  targetRatioPg: 30,
  flavors: [
    { name: "Flavor 1", percentage: 0, weight_src: "PG", custom_weight: 1, id: _.uniqueId() }
  ],

  weightOptions: {
    default: {
      title: 'Default',
      details: "These are the measurements that I've seen the most on the internet.",
      vgWeight: 1.249,
      pgWeight: 1.0361
    },
    amazon_essentials: {
      title: 'Amazon Essentials',
      details: 'These measurement are directly from the manufacturer of the top selling VG and PG 1QT bottles on Amazon. (Personally, I use these measurements)',
      vgWeight: 1.2881,
      pgWeight: 1.07887
    },
    botboy141: {
      title: 'botboy141',
      details: "This reddit user knows their stuff and has paved the way for a lot of us DIY'ers. https://www.reddit.com/r/DIY_eJuice/comments/2iq3km/botboy141_guide_to_mixing_by_weight/",
      vgWeight: 1.26,
      pgWeight: 1.038
    },
    v_ecigs: {
      title: 'v-ecigs.com',
      details: 'This is another well regarded source and is taken from their list here. http://www.v-ecigs.com/tfa-flavor-percentage-recommendations/',
      vgWeight: 1.261,
      pgWeight: 1.036
    }
  },

  printableFontSize: 14,

};

//Fetch the settings object. If it's empty, assign an empty object
var settingsUser = JSON.parse(localStorage.getItem('settings') || '{}');
// @todo _.isObject check?

//Merge the default settings into the user settings (for missing values)
settingsUser = _.defaultsDeep(settingsUser, settingsDefaults);

/**
* @todo settingsUser change listener/updater
* @todo should probably seperate each value to it's own localStorage property for more control
*/
// if(!_.isEqual(settingsUser, settingsDefaults)) {
//   localStorage.setItem('settings', JSON.stringify(settingsUser));
// }


vm = new Vue({
    el: '#wrapper',

    data: settingsUser,

    watch: {
      weightSource: function(val, oldVal) {
        if(val == "custom") {
          return;
        }
        this.vgWeight = this.weightOptions[val].vgWeight;
        this.pgWeight = this.weightOptions[val].pgWeight;
      },
      printableFontSize: function (val, oldVal) {
        $(".print-mode #recipe-totals").css('font-size', val + "px");
      }
    },

    computed: {
      leftoverVgMl: {
        cahce: false,
        get: function() {
          return this.targetBottleSize * (
            (
              parseFloat(this.targetRatioVg) - parseFloat(this.flavorsSum.vg) - parseFloat(this.nicPercentageLiquids.vg)
            ) / 100 );
        }
      },
      leftoverPgMl: {
        cache: false,
        get: function() {
          return this.targetBottleSize * (
            (
              parseFloat(this.targetRatioPg) -  parseFloat(this.flavorsSum.pg) - parseFloat(this.nicPercentageLiquids.pg)
            ) / 100 );
        }
      },

      nicPercentage: {
        cache: false,
        get: function() {
          return (this.targetNicMg / this.nicBaseMg) * 100;
        }
      },

      nicPercentageLiquids: {
        cache: false,
        get: function() {
          var total = this.nicPercentage;
          return {
            vg: total * (this.nicVG / 100),
            pg: total * (this.nicPG / 100)
          };
        }
      },

      nicPercentages: {
        cache: false,
        get: function() {
          var nic_percent = (this.nicBaseMg / 10);
          return {
            pg: (this.nicPG) - ((nic_percent / 10) * (this.nicPG / 10)),
            vg: (this.nicVG) - ((nic_percent / 10) * (this.nicVG / 10)),
            nic: nic_percent
          };
        }
      },
      nicWeight: {
        cache: false,
        /**
        * Calculates the weight of the nicotine base, based on the nicotine weight
        * devided into it's respective VG or PG percentages accordingly (does not just split it 50/50)
        */
        get: function() {
          return  (
                    (this.pgWeight  * (this.nicPercentages.pg / 10)) +
                    (this.vgWeight  * (this.nicPercentages.vg / 10)) +
                    (this.nicPureMg * (this.nicPercentages.nic / 10))
                  ) / 10;
        }
      },

      flavorsSum: {
        cache: false,
        get: function() {
          return {
            all: _.sumBy(this.flavors, function(o){
              return parseFloat(o.percentage);
            }),
            // Sum VG flavors
            pg: _.sumBy(this.flavors, function(o){
              return (o.weight_src == "VG") ? 0: parseFloat(o.percentage);
            }),
            //Sum PG flavors
            vg: _.sumBy(this.flavors, function(o){
              return (o.weight_src == "VG") ? parseFloat(o.percentage): 0;
            })
          };
        }
      }
    },
    methods: {

      fontSizeChange: function(direction) {
        if(direction == "up") {
          if(this.printableFontSize > 24) return;
          this.printableFontSize += 1;
        } else {
          if(this.printableFontSize < 8) return;
          this.printableFontSize -= 1;
        }
      },

      weightSetCustom: function() {
        this.weightSource = 'custom';
      },

      //Function for the change event on the vg/pg target ratio inputs
      changeVgPg: function(e) {
        funcs = {
          'pg_ratio': function() { this.targetRatioVg = 100 - this.targetRatioPg; }.bind(this),
          'vg_ratio': function() { this.targetRatioPg = 100 - this.targetRatioVg; }.bind(this)
        };
        //Us the element ID as the function name
        funcs[e.target.id]();
      },

      // Function for the change event on the vg/pg base nicotine ratio inputs
      changeNicRatio: function(type) {
        funcs = {
          'PG': function() { this.nicVG = 100 - this.nicPG; }.bind(this),
          'VG': function() { this.nicPG = 100 - this.nicVG; }.bind(this)
        };
        //Us the element ID as the function name
        funcs[type]();
      },

      addFlavor: function() {
        this.flavors.push({
          name: "Flavor " + (this.flavors.length + 1),
          percentage: 0,
          weight_src: "PG",
          custom_weight: 1,
          id: _.uniqueId()
        });
      },

      removeFlavor: function(id) {
        this.flavors = _.filter(this.flavors, function(flavor) {
          return (flavor.id == id) ? false : true;
        });
      },

      percent_to_ml: function(percentage) {
        return this.targetBottleSize * ( parseFloat(percentage) / 100 );
      },

      ml_to_mg: function(ml, weightSrc, custom) {
        if(weightSrc == "PG") { weight = this.pgWeight; } else
        if(weightSrc == "VG") { weight = this.vgWeight; } else
        if(custom)            { weight = custom; }

        return parseFloat(ml) * parseFloat(weight);
      }

    }
});

function printable() {
  // $(".components > *:not('#recipe-totals')").hide();
  $("body").addClass('print-mode');
  vm.$set('printable', true);
}

function unPrintable() {
  // $(".components > *:not('#recipe-totals')").show();
  $("body").removeClass('print-mode');
  vm.$set('printable', false);
}

$(document).ready(function() {
  //Init elements
  $('.modal-trigger').leanModal();

  // Flavor close button
  $("body").on('click', '.flavor-close', function(){
    $( $(this).parents('.collapsible-body').siblings()[0] ).trigger('click');
  });

});
