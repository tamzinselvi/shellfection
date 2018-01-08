# {{{ ZSH settings
HISTFILE=~/.histfile
HISTSIZE=1000
SAVEHIST=1000
setopt autocd extendedglob
setopt PROMPT_SUBST
setopt HIST_IGNORE_SPACE
unsetopt beep
unsetopt PROMPT_CR
autoload -Uz compinit
autoload -U colors && colors
zstyle :compinstall filename '/home/$USER/.zshrc'
compinit
bindkey -e
bindkey "^[[3~" delete-char
bindkey "^H"    backward-delete-word
bindkey "^[[7~" beginning-of-line
bindkey "^[Oc"  forward-word
bindkey "^[Od"  backward-word
bindkey "^[[A"  history-search-backward
bindkey "^[[B"  history-search-forward
# }}}

# {{{ Build environment
# Set TERM, if we're not in a vty
if [ "$TERM" != "linux" ]; then
  export TERM="screen-256color"
fi

export EDITOR='vim'
export PYTHONSTARTUP="$HOME/.pythonrc.py"
# }}}

# {{{ Autolaunch
# (( $+commands[TODO] )) && TODO
# }}}

# {{{ Configure prompt
# {{{ Custom symbols
POWERLINE="1"

if [ "$POWERLINE" = "1" ]; then
  LSEP1='\xee\x82\xb0' # left thick seperator
  LSEP2='\xE2\xAE\x81\x00' # left thin seperator
  RSEP1='\xee\x82\xb2' # right thick seperator
  RSEP2='\xE2\xAE\x83\x00' # right thin seperator
else
  LSEP1=''
  LSEP2=''
  RSEP1=''
  RSEP2=''
fi
# }}}

# {{{ Git info
function info-git(){
  branch=$(git symbolic-ref HEAD 2>/dev/null | sed "s/refs\/heads\///g")
  if [[ -n "$branch" ]]; then
    changes=$(git status --porcelain 2>/dev/null | grep '^?? ')
    commits=$(git status --porcelain 2>/dev/null | grep -v '^?? ')
    symbol=""
    if [[ -n "$commits" ]]; then
      symbol+="!"
    else
      symbol+="."
    fi
    if [[ -n "$changes" ]]; then
      symbol+="?"
    else
      symbol+="."
    fi
    if [[ -n "$symbol" ]]; then
      if [ ! "$symbol" = ".." ]; then
        echo -ne "%F{red}$RSEP1%K{red}%f $symbol %K{red}%F{green}$RSEP1%K{green}%F{black} $branch %k%f"
      else
        echo -ne "%F{green}$RSEP1%K{green}%F{black} $branch %k%f"
      fi
    fi
  fi
}
# }}}

# {{{ Status info
function info-status(){
  STATUS="$?"
  if [ "$STATUS" = "0" ]; then
    echo -ne "%K{green}%F{black} + %K{black}%F{green}$LSEP1"
  else
    echo -ne "%K{red}%f $STATUS %K{black}%F{red}$LSEP1"
  fi
}
# }}}

# {{{ User info
function info-user(){
  UID="$(id -u)"
  if [[ "$UID" -eq 0 ]]; then
    echo -ne "%K{black}%B%F{red} %n%b%B%K{black}%F{black}@%b%B%K{black}%F{red}%M%b%K{black} %K{blue}%F{black}$LSEP1 %f%. %k%F{blue}$LSEP1"
  else
    echo -ne "%K{black}%B%F{blue} %n%b%B%K{black}%F{black}@%b%B%K{black}%F{blue}%M%b%K{black} %K{blue}%F{black}$LSEP1 %f%. %k%F{blue}$LSEP1"
  fi
}
# }}}

# {{{ Assemble prompt
if [[ "$(id -u)" -eq 0 ]]; then
  PROMPT=$(echo -ne '\n$(info-status)$(info-user)%f %B%F{black}#%b%f ')
else
  PROMPT=$(echo -ne '\n$(info-status)$(info-user)%f %B%F{black}$%b%f ')
fi

RPROMPT='$(info-git)%f'
# }}}
# }}}

# {{{ Local
. ~/.zshrc.local
# }}}

# Aliases
. ~/.aliasrc

# {{{ Welcome prompt if not in TMUX
if ! { [ -n "$TMUX" ]; } then
  shellfection-welcome
fi
# }}}
