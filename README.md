# JotaTools
### A simple utility for Jota's ifMUD scripting language.

Effectively, this lets you span JotaCode across multiple lines, and quickly condense it for upload. If you have an uploading string, you can also automatically unwrap it for readability.

This tool set also implements two macros, and a comment system:
```
# Comments are started with a '#' symbol.
# With a known object dbref of 77:

@my("fieldname") -> @getfield("77","fieldname")
@do("fieldname") -> @execute(@getfield("77","fieldname"))
```

This can also be used for processing multi-line messages:
```
Hello%c%cworld!
```
...becomes:
```
Hello

world!
```