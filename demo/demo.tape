# tinysystems.io demo — recorded against a real minikube cluster.
# Requires: tiny in PATH, minikube context, agents namespace.
Output demo/demo.gif
Output demo/demo.mp4

Set FontSize 15
Set Width 1150
Set Height 440
Set Padding 18
Set Theme { "name": "tiny", "background": "#20281f", "foreground": "#eeede0", "cursor": "#7fd695", "green": "#7fd695", "yellow": "#e9b45c", "black": "#20281f", "red": "#e05252", "blue": "#7aa2c9", "magenta": "#b58dae", "cyan": "#7fc9b2", "white": "#eeede0", "brightBlack": "#5a6357", "brightRed": "#e05252", "brightGreen": "#7fd695", "brightYellow": "#e9b45c", "brightBlue": "#7aa2c9", "brightMagenta": "#b58dae", "brightCyan": "#7fc9b2", "brightWhite": "#ffffff" }
Set TypingSpeed 40ms

Type "tiny new --context minikube -n agents --name demo-arch --repo https://github.com/tiny-systems/seedling.git 'study this repo and write ARCHITECTURE.md' "
Sleep 800ms
Enter
Sleep 6s
Hide
Sleep 70s
Show
Sleep 1s

Type "tiny --context minikube -n agents"
Sleep 500ms
Enter
Sleep 9s
Type "q"
Sleep 1s

Type "clear"
Enter
Type "# close the laptop. kill the pod. it does not care:"
Sleep 500ms
Enter
Type "kubectl -n agents delete pod -l tinysystems.io/session=demo-arch"
Sleep 800ms
Enter
Sleep 4s
Hide
Sleep 40s
Show

Type "tiny --context minikube -n agents"
Sleep 500ms
Enter
Sleep 8s
Type "q"
Sleep 1s

Type "clear"
Enter
Type "# sessions survive anything — tinysystems.io"
Sleep 4s
