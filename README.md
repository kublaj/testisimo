# testisimo
End-to-end tester in pure javascript

## for production
```
<script type="text/javascript">
    (function() {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.async = true;
        s.src = 'https://cdn.rawgit.com/nodejs-enterprise/testisimo/master/testisimo.min.js?v=0.1.0';
        var x = document.getElementsByTagName('script')[0];
        x.parentNode.insertBefore(s, x);
    })();
</script>
```
or
```
<script src="https://cdn.rawgit.com/nodejs-enterprise/testisimo/master/testisimo.min.js?v=0.1.0"></script>
```

## for testing
```
<script type="text/javascript">
    (function() {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.async = true;
        s.src = 'https://rawgit.com/nodejs-enterprise/testisimo/master/testisimo.js';
        var x = document.getElementsByTagName('script')[0];
        x.parentNode.insertBefore(s, x);
    })();
</script>
```