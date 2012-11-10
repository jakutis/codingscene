# CodingScene

Web application for coding events, problems, contacts.

# Compiling and running

    make

# Using and developing

Open the webapp in browser, register your demo user.
To confirm the registered user you'll have to either copy confirmation hash from sql codinscene.users.confirmation field, or have a correct smtp configuration.
Then you login and see that there are no events.
Not only that, but there is also no administrator's panel.
You'll have to INSERT your events, activities, tasks, etc. by hand at this point.
Then you look at the source code and see a perfectly engineered mess.
Plus, no unit tests and no acceptance tests.
Better someone else adds the new features.
Or whatever.

# License

This software is released under the [GNU General Public License v3](http://www.gnu.org/copyleft/gpl.html).

# Contributors

  * [Vytautas Jakutis](https://jakut.is)
