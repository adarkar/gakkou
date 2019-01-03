var kame = {
  init: function() {
    this.reset();
    d3.select("#svg").append("g")
      .attr("id", "canv");
    var kameg = d3.select("#svg").append("g")
      .attr("id", "kame");
    kameg.append("path")
      .attr("stroke", "none")
      .attr("fill", "seagreen")
      .attr("d", "M 5,0 Q 5,-3 0,-8 Q -5,-3 -5,0 z"
      );
    kameg.append("circle")
      .attr("id", "kame_cir")
      .attr("r", 5)
      .attr("cx", this.x)
      .attr("cy", this.y)
      .attr("fill", "seagreen");
  },

  reset: function() {
    this.instr = [];
    this.steptime = 100;
    this.flashrun = false;
    function state0() {
      return {
        x: 0,
        y: 0,
        th: 1/4,
        pencolor: "seagreen",
        ststack: [],
        userstate: {}
      };
    }
    this._stdup = function(st) {
      return JSON.parse(JSON.stringify(st));
    };
    this._stcopy = function(d, s) {
      d.x = s.x;
      d.y = s.y;
      d.th = s.th;
      d.pencolor = s.pencolor;
      d.ststack = s.ststack;
      d.userstate = s.userstate;
    };
    this.state_m = state0(); // code monad
    this.state_d = state0(); // drawing
    d3.select("#canv").selectAll("*").remove();
    this.drawkame();
  },

  drawkame: function() {
    var kametrans =
      "translate("+this.state_d.x+","+(-this.state_d.y)+")"
      + "rotate("+(-360*(this.state_d.th-1/4))+")";
    if (this.flashrun) {
      d3.select("#kame").interrupt()
        .attr("transform", kametrans);
    } else {
      d3.select("#kame").transition().duration(this.steptime)
        .attr("transform", kametrans);
    }
  },

  run: function() {
    if (! this.running) {
      this.running = true;
      if (! this.flashrun) {
        this.runii = setInterval(()=>{
          if (this.instr.length > 0) this.instr.shift()();
          else this._stoprun();
        }, this.steptime);
      } else {
        this.runii = setInterval(()=>{
          if (this.instr.length > 0) {
            let n = Math.min(this.instr.length, 1000);
            Array(n).fill(0).map(()=>this.instr.shift()());
          }
          else {
            this.flashrun = false;
            this._stoprun();
          }
        }, 100);
      }
    }
  },

  _stoprun: function() {
    if (this.running) {
      clearInterval(this.runii);
      this.running = false;
    }
  },

  finish: function() {
    this._stoprun();
    this.flashrun = true;
    this.run();
  },

  time: function(t) {
    this._stoprun();
    this.steptime = Math.max(5, t);
    this.run();
  },

  _mkinstr: function(f) {
    f(this.state_m, false);
    this.instr.push(()=>f(this.state_d, true));
    this.run();
  },

  f: function(l) {
    this._mkinstr((st, dr) => {
      var x0 = st.x;
      var y0 = st.y;
      var x1 = x0 + l * Math.cos(Math.tau * st.th);
      var y1 = y0 + l * Math.sin(Math.tau * st.th);
      st.x = x1;
      st.y = y1;
      if (dr) {
        if (this.flashrun) {
          d3.select("#canv").append("path")
            .attr("stroke", st.pencolor)
            .attr("d", d3.line()([[x0,-y0],[x1,-y1]]));
        } else {
          d3.select("#canv").append("path")
            .attr("d", d3.line()([[x0,-y0],[x0,-y0]]))
            .attr("stroke", st.pencolor)
            .transition().duration(this.steptime)
            .attr("d", d3.line()([[x0,-y0],[x1,-y1]]));
        }
        this.drawkame();
      }
    });
  },

  m: function(l) {
    this._mkinstr((st, dr) => {
      var x1 = st.x + l * Math.cos(Math.tau * st.th);
      var y1 = st.y + l * Math.sin(Math.tau * st.th);
      st.x = x1;
      st.y = y1;
      if (dr) {
        this.drawkame();
      }
    });
  },

  r: function(a) {
    this._mkinstr((st, dr) => {
      st.th -= a;
      st.th = ((st.th % 1) + 1) % 1;
      if (dr) {
        this.drawkame();
      }
    });
  },

  l: function(a) {
    this._mkinstr((st, dr) => {
      st.th += a;
      st.th = ((st.th % 1) + 1) % 1;
      if (dr) {
        this.drawkame();
      }
    });
  },

  p: function() {
    this._mkinstr((st,dr) => {
      if (dr) {
        d3.select("#canv").append("circle")
          .attr("stroke-width", "0")
          .attr("fill", st.pencolor)
          .attr("cx", st.x)
          .attr("cy", -st.y)
          .attr("r", "2");
      }
    });
  },

  getAngle: function() {
    return this.state_m.th;
  },

  penColor: function(c) {
    this._mkinstr((st,dr) => {
      st.pencolor = c;
    });
  },

  push: function() {
    this._mkinstr((st,dr) => {
      st.ststack.push(this._stdup(st));
    });
  },

  pop: function() {
    this._mkinstr((st,dr) => {
      if (st.ststack.length > 0) {
        this._stcopy(st, st.ststack.pop());
        if (dr) {
          this.drawkame();
        }
      }
    });
  },

  sLoad: function(tag) {
    return this.state_m.userstate[tag];
  },

  sStore: function(tag, v) {
    this._mkinstr((st,dr) => {
      st.userstate[tag] = v;
    });
  },

  sModify: function(tag, f) {
    this._mkinstr((st,dr) => {
      st.userstate[tag] = f(st.userstate[tag]);
    });
  },

  repeat: function(n, f) {
    Array(n).fill({}).map(()=>f());
  },

  forIndex: function(n, f) {
    Array(n).fill({}).map((x,i)=>f(i,n));
  },

  loop: function(c, f) {
    this._mkinstr((st,dr) => {
      while (c()) f();
    });
  }
};

kame.init();
