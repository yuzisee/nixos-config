// Auto-imported filters by 'gmailctl download'.
//
// WARNING: This functionality is experimental. Before making any
// changes, check that no diff is detected with the remote filters by
// using the 'diff' command.

// Uncomment if you want to use the standard library.
// local lib = import 'gmailctl.libsonnet';
{
  version: "v1alpha3",
  author: {
    name: "YOUR NAME HERE (auto imported)",
    email: "your-email@gmail.com"
  },
  rules: [
    {
      filter: {
        and: [
          {
            from: "aeryon.com"
          },
          {
            to: "aeryon.com"
          },
          {
            subject: "[SVN]"
          }
        ]
      },
      actions: {
        archive: true,
        labels: [
          "Aeryon SVN"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "AUTO-GENERATED-DO-NOT-REPLY@aeryon.com"
          },
          {
            subject: "ITS"
          }
        ]
      },
      actions: {
        labels: [
          "Aeryon SVN"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "@teksavvy.ca"
          },
          {
            subject: "**INVOICE** from TekSavvy Solutions",
            isEscaped: true
          }
        ]
      },
      actions: {
        labels: [
          "TekSavvy"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "Sabine Kawalec",
            isEscaped: true
          },
          {
            subject: "[Eng_ugrad_on]"
          },
          {
            query: "listid:(\u003ceng_ugrad_on.engmail.uwaterloo.ca\u003e)"
          }
        ]
      },
      actions: {
        archive: true,
        markRead: true,
        labels: [
          "UWLists"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "Linda Huang",
            isEscaped: true
          },
          {
            subject: "Fwd"
          }
        ]
      },
      actions: {
        archive: true,
        labels: [
          "Forward"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "tafangh@yahoo.com"
          },
          {
            subject: "Fw:"
          }
        ]
      },
      actions: {
        archive: true,
        labels: [
          "Forward"
        ]
      }
    },
    {
      filter: {
        from: "bill@billmonk.com"
      },
      actions: {
        labels: [
          "Billmonk"
        ]
      }
    },
    {
      filter: {
        query: "list:(upper-year.lists.uwaterloo.ca)"
      },
      actions: {
        markRead: true,
        labels: [
          "UWLists"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "accounting@teksavvy.com"
          },
          {
            subject: "TekSavvy Solutions Inc. - Invoice",
            isEscaped: true
          }
        ]
      },
      actions: {
        markRead: true,
        labels: [
          "TekSavvy"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "service@youtube.com"
          },
          {
            subject: "Subscription Update",
            isEscaped: true
          }
        ]
      },
      actions: {
        labels: [
          "Subscription"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "tafangh@yahoo.com"
          },
          {
            subject: "Fwd:"
          }
        ]
      },
      actions: {
        archive: true,
        labels: [
          "Forward"
        ]
      }
    },
    {
      filter: {
        from: "noreply@sourceforge.net"
      },
      actions: {
        labels: [
          "Sourceforge"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "service@youtube.com"
          },
          {
            query: "Subscription"
          }
        ]
      },
      actions: {
        archive: true,
        labels: [
          "Subscription"
        ]
      }
    },
    {
      filter: {
        from: "@stanford.edu"
      },
      actions: {
        labels: [
          "Stanford"
        ]
      }
    },
    {
      filter: {
        to: "mscs@cs.stanford.edu"
      },
      actions: {
        labels: [
          "Stanford"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "postmaster@zm01.stanford.edu"
          },
          {
            subject: "New message received at jdhuang",
            isEscaped: true
          }
        ]
      },
      actions: {
        archive: true,
        markSpam: false,
        labels: [
          "Stanford"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "care@getpeek.com"
          },
          {
            subject: "Peek Pro Tip",
            isEscaped: true
          }
        ]
      },
      actions: {
        archive: true,
        markRead: true,
        labels: [
          "Peek"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "jp@jporganics.com"
          },
          {
            subject: "Weekly Produce Box",
            isEscaped: true
          }
        ]
      },
      actions: {
        archive: true,
        markRead: true,
        labels: [
          "J\u0026P Produce Box"
        ]
      }
    },
    {
      filter: {
        from: "alumlist@alumni.uwaterloo.ca"
      },
      actions: {
        labels: [
          "UWLists"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "myecokarma@alerts.assembla.com"
          },
          {
            subject: "Changeset"
          }
        ]
      },
      actions: {
        archive: true,
        labels: [
          "SVN"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "invitations@linkedin.com"
          },
          {
            subject: "Reminder about your invitation from",
            isEscaped: true
          }
        ]
      },
      actions: {
        archive: true,
        markRead: true
      }
    },
    {
      filter: {
        from: "news@e.dealextreme.com"
      },
      actions: {
        archive: true,
        labels: [
          "Subscription"
        ]
      }
    },
    {
      filter: {
        from: "support@qwhispr.com"
      },
      actions: {
        archive: true,
        labels: [
          "Qwhispr"
        ]
      }
    },
    {
      filter: {
        from: "notifications@sselabs.basecamphq.com"
      },
      actions: {
        archive: true,
        markRead: true,
        markSpam: false,
        labels: [
          "SSE"
        ]
      }
    },
    {
      filter: {
        from: "webmaster@viarail.ca"
      },
      actions: {
        archive: true,
        labels: [
          "Subscription"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "do_not_reply@thesharedweb.com"
          },
          {
            subject: "\"just thanked you for\"",
            isEscaped: true
          }
        ]
      },
      actions: {
        markRead: true
      }
    },
    {
      filter: {
        and: [
          {
            from: "group-digests@linkedin.com"
          },
          {
            query: "\"C100 Supporting Canadian Entrepreneurs\""
          }
        ]
      },
      actions: {
        archive: true,
        markSpam: false,
        labels: [
          "C100"
        ]
      }
    },
    {
      filter: {
        from: "noreply plus.google.com",
        isEscaped: true
      },
      actions: {
        archive: true,
        markSpam: false,
        markImportant: false,
        labels: [
          "Notifications"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "info ieee",
            isEscaped: true
          },
          {
            to: "josephhuang@alumni.uwaterloo.ca AND jdhuang@stanford.edu",
            isEscaped: true
          }
        ]
      },
      actions: {
        archive: true,
        labels: [
          "Subscription"
        ]
      }
    },
    {
      filter: {
        from: "do_not_reply@thesharedweb.com"
      },
      actions: {
        archive: true,
        markSpam: false,
        labels: [
          "Notifications"
        ]
      }
    },
    {
      filter: {
        from: "please-reply@raunk.com OR no-reply@loopt.com OR wizards@loopt.com",
        isEscaped: true
      },
      actions: {
        archive: true,
        markSpam: false,
        markImportant: false,
        labels: [
          "Subscription"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "alert@kayak.com"
          },
          {
            subject: "Your Price Alert",
            isEscaped: true
          }
        ]
      },
      actions: {
        markRead: true
      }
    },
    {
      filter: {
        from: "sourceforge@newsletters.sourceforge.net"
      },
      actions: {
        archive: true,
        markSpam: false,
        labels: [
          "Subscription"
        ]
      }
    },
    {
      filter: {
        from: "updates@linkedin.com OR messages-noreply@linkedin.com OR member@linkedin.com",
        isEscaped: true
      },
      actions: {
        archive: true,
        labels: [
          "Notifications"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "do_not_reply@3jam.com"
          },
          {
            subject: "\"Call from\"",
            isEscaped: true
          }
        ]
      },
      actions: {
        archive: true,
        markSpam: false,
        labels: [
          "Peek"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "voice-noreply@google.com"
          },
          {
            subject: "\"New missed call from\"",
            isEscaped: true
          }
        ]
      },
      actions: {
        archive: true,
        markSpam: false,
        labels: [
          "Peek"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "news@e.dx.com"
          },
          {
            to: "yuzisee@gmail.com"
          }
        ]
      },
      actions: {
        archive: true,
        markSpam: false,
        labels: [
          "Subscription"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "noreply@code.pokerai.p.re.sf.net"
          },
          {
            to: "noreply@code.pokerai.p.re.sf.net"
          },
          {
            subject: "[pokerai:code]"
          }
        ]
      },
      actions: {
        archive: true,
        markSpam: false,
        labels: [
          "Sourceforge"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "notification+pocfzzp1@facebookmail.com OR update+pocfzzp1@facebookmail.com",
            isEscaped: true
          },
          {
            query: "-{(subject:(\"[StartX Community] \") OR subject:(\"[U of I Hack Night]\")}"
          }
        ]
      },
      actions: {
        archive: true,
        markSpam: false,
        labels: [
          "[Mailbox]/Facebook"
        ]
      }
    },
    {
      filter: {
        query: "from:(notification+pocfzzp1@facebookmail.com) AND (subject:(\"[StartX Community] \") OR subject:(\"[U of I Hack Night]\"))"
      },
      actions: {
        archive: true,
        labels: [
          "Facebook Groups"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "alexliu01@hotmail.com"
          },
          {
            to: "yuzisee@gmail.com"
          }
        ]
      },
      actions: {
        archive: true,
        markSpam: false,
        labels: [
          "[Mailbox]/MapMeIn"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "alexcliu01@gmail.com"
          },
          {
            to: "yuzisee@gmail.com"
          }
        ]
      },
      actions: {
        archive: true,
        markSpam: false,
        markImportant: true,
        labels: [
          "[Mailbox]/MapMeIn"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            to: "Prometheus-group@googlegroups.com"
          },
          {
            subject: "Prometheus"
          }
        ]
      },
      actions: {
        archive: true,
        labels: [
          "[Mailbox]/MapMeIn"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "alexliu@post.harvard.edu,"
          },
          {
            to: "yuzisee@gmail.com,"
          }
        ]
      },
      actions: {
        archive: true,
        labels: [
          "[Mailbox]/MapMeIn"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "azrael.brightman@aol.com"
          },
          {
            to: "yuzisee@gmail.com,"
          }
        ]
      },
      actions: {
        archive: true,
        labels: [
          "Deleted Messages"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "alexliu000001@gmail.com"
          },
          {
            to: "yuzisee@gmail.com"
          }
        ]
      },
      actions: {
        archive: true,
        labels: [
          "[Mailbox]/MapMeIn"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "aliu8128@gmail.com"
          },
          {
            to: "yuzisee@gmail.com"
          }
        ]
      },
      actions: {
        archive: true,
        markSpam: false,
        labels: [
          "[Mailbox]/MapMeIn"
        ]
      }
    },
    {
      filter: {
        from: "noreply@quibbmail.com"
      },
      actions: {
        archive: true,
        markImportant: false,
        labels: [
          "[Mailbox]/Later"
        ]
      }
    },
    {
      filter: {
        query: "from:(\"*@txt.voice.google.com\") to:(yuzisee@gmail.com) {(subject:SMS) OR (subject:\"New Text Message\")} -{has:attachment}"
      },
      actions: {
        archive: true,
        markSpam: false,
        labels: [
          "Queue"
        ]
      }
    },
    {
      filter: {
        query: "list:(0cc46393237ab4d571b069d41.309957.list-id.mcsv.net)"
      },
      actions: {
        archive: true,
        markRead: true,
        markSpam: false
      }
    },
    {
      filter: {
        query: "from:(no_reply@post.applecard.apple) {subject:(Your payment as been received) OR subject:(Your Apple Card statement is ready)}"
      },
      actions: {
        archive: true,
        category: "updates",
        labels: [
          "AppleISS"
        ]
      }
    },
    {
      filter: {
        and: [
          {
            from: "googlealerts-noreply@google.com"
          },
          {
            to: "yuzisee@gmail.com"
          },
          {
            subject: "Google Alert Weekly Digest",
            isEscaped: true
          },
          {
            query: "list:\u003c*.alerts.google.com\u003e"
          }
        ]
      },
      actions: {
        archive: true,
        markSpam: false,
        markImportant: false,
        category: "personal",
        labels: [
          "[Mailbox]/Later"
        ]
      }
    },
    {
      filter: {
        query: "{from:(info@wt.social) OR from:(info@wikitribune.com)} AND subject:(\"update from wt.social\")"
      },
      actions: {
        archive: true,
        markImportant: false,
        category: "social",
        labels: [
          "[Mailbox]/Later"
        ]
      }
    }
  ]
}
