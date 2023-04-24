sap.ui.define(
    [
        "sap/ui/core/mvc/Controller"
    ],
    function(BaseController) {
      "use strict";
      function onMapClick(e) {
        var clickedAnnotation = e.annotation;
        if (clickedAnnotation && clickedAnnotation.myid) {
            Ti.API.info('User clicked on ' + clickedAnnotation.title + ' (id: ' + clickedAnnotation.myid + ')');
        }
    }
      return BaseController.extend("bupamap.controller.App", {
        onInit() {
        }
      });
    }
  );
  